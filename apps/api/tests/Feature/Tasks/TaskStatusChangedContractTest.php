<?php

namespace Tests\Feature\Tasks;

use App\Enums\TaskState;
use App\Events\TaskStatusChanged;
use App\Models\Task;
use DateTimeImmutable;
use DateTimeInterface;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Str;
use JsonException;
use Tests\TestCase;

class TaskStatusChangedContractTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @throws JsonException
     */
    public function test_every_broadcast_matches_the_generated_asyncapi_contract(): void
    {
        $contractPath = realpath(base_path('contracts/realtime/generated/realtime-contracts.json'))
            ?: realpath(base_path('../../contracts/realtime/generated/realtime-contracts.json'));

        $this->assertNotFalse($contractPath, 'Generate realtime contract artifacts before running PHP tests.');

        /** @var array{messages: list<array{action: string, channel: string, event: string, operation: string, payload: array<string, mixed>}>} $manifest */
        $manifest = json_decode((string) file_get_contents($contractPath), true, flags: JSON_THROW_ON_ERROR);
        $events = $this->eventCases();
        $contractKeys = array_map(
            fn (array $contract): string => $contract['operation'].':'.$contract['event'],
            $manifest['messages'],
        );

        $this->assertEqualsCanonicalizing(array_keys($events), $contractKeys);

        foreach ($manifest['messages'] as $contract) {
            $key = $contract['operation'].':'.$contract['event'];
            $event = $events[$key];

            $this->assertSame('receive', $contract['action']);
            $this->assertInstanceOf(ShouldBroadcast::class, $event);
            $this->assertInstanceOf(ShouldDispatchAfterCommit::class, $event);
            $this->assertSame($contract['event'], $event->broadcastAs());

            $channel = $event->broadcastOn();
            $this->assertInstanceOf(PrivateChannel::class, $channel);
            $this->assertSame($this->resolveChannel($contract['channel'], $event), $channel->name);

            $payload = $event->broadcastWith();
            $this->assertSchema($payload, $contract['payload'], '$');

            if (isset($contract['payload']['properties']['state']['enum'])) {
                $states = array_map(fn (TaskState $state): string => $state->value, TaskState::cases());
                $this->assertEqualsCanonicalizing(
                    $contract['payload']['properties']['state']['enum'],
                    $states,
                );
            }
        }
    }

    /**
     * @throws JsonException
     */
    public function test_every_contracted_private_channel_has_laravel_authorization(): void
    {
        $contractPath = realpath(base_path('contracts/realtime/generated/realtime-contracts.json'))
            ?: realpath(base_path('../../contracts/realtime/generated/realtime-contracts.json'));

        $this->assertNotFalse($contractPath, 'Generate realtime contract artifacts before running PHP tests.');

        /** @var array{channels: list<array{address: string}>} $manifest */
        $manifest = json_decode((string) file_get_contents($contractPath), true, flags: JSON_THROW_ON_ERROR);
        $contracted = collect($manifest['channels'])
            ->pluck('address')
            ->filter(fn (string $address): bool => str_starts_with($address, 'private-'))
            ->map(fn (string $address): string => $this->normalizeChannel(substr($address, 8)))
            ->sort()
            ->values()
            ->all();
        $implemented = Broadcast::getChannels()
            ->keys()
            ->map(fn (string $channel): string => $this->normalizeChannel($channel))
            ->sort()
            ->values()
            ->all();

        $this->assertSame($contracted, $implemented);
    }

    /**
     * @return array<string, TaskStatusChanged>
     */
    private function eventCases(): array
    {
        $task = Task::factory()->create([
            'state' => TaskState::Processing,
            'processing_token' => '00000000-0000-7000-8000-000000000003',
            'version' => 2,
            'started_at' => now(),
        ]);

        return [
            'receiveTaskStatusChanged:TaskStatusChanged' => TaskStatusChanged::fromTask($task),
        ];
    }

    private function resolveChannel(string $template, object $event): string
    {
        return preg_replace_callback('/\{([^}]+)\}/', function (array $matches) use ($event): string {
            $property = $matches[1];
            $this->assertTrue(property_exists($event, $property), "Missing channel property: {$property}");

            return (string) $event->{$property};
        }, $template) ?? $template;
    }

    private function normalizeChannel(string $channel): string
    {
        return preg_replace('/\{[^}]+\}/', '{}', $channel) ?? $channel;
    }

    /**
     * @param  array<string, mixed>  $schema
     */
    private function assertSchema(mixed $value, array $schema, string $path): void
    {
        if (array_key_exists('const', $schema)) {
            $this->assertSame($schema['const'], $value, "{$path} must use the contracted constant.");
        }

        if (isset($schema['enum'])) {
            $this->assertContains($value, $schema['enum'], "{$path} must use a contracted value.");
        }

        match ($schema['type'] ?? null) {
            'array' => $this->assertArraySchema($value, $schema, $path),
            'boolean' => $this->assertIsBool($value, "{$path} must be a boolean."),
            'integer' => $this->assertIntegerSchema($value, $schema, $path),
            'null' => $this->assertNull($value, "{$path} must be null."),
            'number' => $this->assertNumberSchema($value, $schema, $path),
            'object' => $this->assertObjectSchema($value, $schema, $path),
            'string' => $this->assertStringSchema($value, $schema, $path),
            default => $this->fail("Unsupported AsyncAPI payload type at {$path}."),
        };
    }

    /**
     * @param  array<string, mixed>  $schema
     */
    private function assertArraySchema(mixed $value, array $schema, string $path): void
    {
        $this->assertIsArray($value, "{$path} must be an array.");

        if (isset($schema['minItems'])) {
            $this->assertGreaterThanOrEqual($schema['minItems'], count($value), "{$path} has too few items.");
        }
        if (isset($schema['maxItems'])) {
            $this->assertLessThanOrEqual($schema['maxItems'], count($value), "{$path} has too many items.");
        }

        foreach ($value as $index => $item) {
            $this->assertSchema($item, $schema['items'], "{$path}.{$index}");
        }
    }

    /**
     * @param  array<string, mixed>  $schema
     */
    private function assertIntegerSchema(mixed $value, array $schema, string $path): void
    {
        $this->assertIsInt($value, "{$path} must be an integer.");

        if (isset($schema['minimum'])) {
            $this->assertGreaterThanOrEqual($schema['minimum'], $value, "{$path} is below minimum.");
        }
        if (isset($schema['maximum'])) {
            $this->assertLessThanOrEqual($schema['maximum'], $value, "{$path} is above maximum.");
        }
    }

    /**
     * @param  array<string, mixed>  $schema
     */
    private function assertObjectSchema(mixed $value, array $schema, string $path): void
    {
        $this->assertIsArray($value, "{$path} must be an object payload.");
        $required = $schema['required'] ?? [];

        foreach ($required as $name) {
            $this->assertArrayHasKey($name, $value, "{$path}.{$name} is required.");
        }

        $properties = $schema['properties'] ?? [];
        $extraKeys = array_values(array_diff(array_keys($value), array_keys($properties)));
        $additionalProperties = $schema['additionalProperties'] ?? true;

        if ($additionalProperties === false) {
            $this->assertSame([], $extraKeys, "{$path} contains uncontracted properties.");
        } elseif (is_array($additionalProperties)) {
            foreach ($extraKeys as $name) {
                $this->assertSchema($value[$name], $additionalProperties, "{$path}.{$name}");
            }
        }

        if (isset($schema['minProperties'])) {
            $this->assertGreaterThanOrEqual($schema['minProperties'], count($value));
        }
        if (isset($schema['maxProperties'])) {
            $this->assertLessThanOrEqual($schema['maxProperties'], count($value));
        }

        foreach ($properties as $name => $property) {
            if (array_key_exists($name, $value)) {
                $this->assertSchema($value[$name], $property, "{$path}.{$name}");
            }
        }
    }

    /**
     * @param  array<string, mixed>  $schema
     */
    private function assertNumberSchema(mixed $value, array $schema, string $path): void
    {
        $this->assertTrue(is_int($value) || is_float($value), "{$path} must be numeric.");

        if (isset($schema['minimum'])) {
            $this->assertGreaterThanOrEqual($schema['minimum'], $value, "{$path} is below minimum.");
        }
        if (isset($schema['maximum'])) {
            $this->assertLessThanOrEqual($schema['maximum'], $value, "{$path} is above maximum.");
        }
    }

    /**
     * @param  array<string, mixed>  $schema
     */
    private function assertStringSchema(mixed $value, array $schema, string $path): void
    {
        $this->assertIsString($value, "{$path} must be a string.");

        $format = $schema['format'] ?? null;
        if ($format === 'date-time') {
            $parsed = DateTimeImmutable::createFromFormat(DateTimeInterface::RFC3339_EXTENDED, $value)
                ?: DateTimeImmutable::createFromFormat(DateTimeInterface::RFC3339, $value);
            $this->assertNotFalse($parsed, "{$path} must use RFC 3339 date-time format.");
        } elseif ($format === 'email') {
            $this->assertNotFalse(filter_var($value, FILTER_VALIDATE_EMAIL), "{$path} must be an email.");
        } elseif ($format === 'uri') {
            $this->assertNotFalse(filter_var($value, FILTER_VALIDATE_URL), "{$path} must be a URI.");
        } elseif ($format === 'uuid') {
            $this->assertTrue(Str::isUuid($value), "{$path} must be a UUID.");
        } elseif ($format !== null) {
            $this->fail("Unsupported AsyncAPI string format at {$path}: {$format}");
        }
        if (isset($schema['minLength'])) {
            $this->assertGreaterThanOrEqual($schema['minLength'], mb_strlen($value));
        }
        if (isset($schema['maxLength'])) {
            $this->assertLessThanOrEqual($schema['maxLength'], mb_strlen($value));
        }
        if (isset($schema['pattern'])) {
            $pattern = '/'.str_replace('/', '\\/', $schema['pattern']).'/';
            $this->assertMatchesRegularExpression($pattern, $value);
        }
    }
}
