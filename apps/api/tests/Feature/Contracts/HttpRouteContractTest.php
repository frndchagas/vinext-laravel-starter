<?php

namespace Tests\Feature\Contracts;

use App\Enums\TaskState;
use Illuminate\Routing\Route;
use JsonException;
use Tests\TestCase;

class HttpRouteContractTest extends TestCase
{
    /**
     * @throws JsonException
     */
    public function test_laravel_application_routes_match_the_generated_http_contract(): void
    {
        $contractPath = realpath(base_path('contracts/http/generated/operations.json'))
            ?: realpath(base_path('../../contracts/http/generated/operations.json'));

        $this->assertNotFalse($contractPath, 'Generate HTTP contract artifacts before running PHP tests.');

        /** @var array{enums: array<string, list<string>>, operations: list<array{method: string, operation_id: string, path: string}>} $manifest */
        $manifest = json_decode((string) file_get_contents($contractPath), true, flags: JSON_THROW_ON_ERROR);

        $contracted = array_map(
            fn (array $operation): string => $operation['method'].' '.$this->normalizePath($operation['path']),
            $manifest['operations'],
        );

        $implemented = collect(app('router')->getRoutes()->getRoutes())
            ->filter(fn (Route $route): bool => $this->belongsToContract($route->uri()))
            ->flatMap(fn (Route $route): array => collect($route->methods())
                ->reject(fn (string $method): bool => in_array($method, ['HEAD', 'OPTIONS'], true))
                ->map(fn (string $method): string => $method.' '.$this->normalizePath('/'.$route->uri()))
                ->all())
            ->values()
            ->all();

        sort($contracted);
        sort($implemented);

        $this->assertSame($contracted, $implemented);
    }

    /**
     * @throws JsonException
     */
    public function test_laravel_task_states_match_the_generated_http_contract(): void
    {
        $contractPath = realpath(base_path('contracts/http/generated/operations.json'))
            ?: realpath(base_path('../../contracts/http/generated/operations.json'));

        $this->assertNotFalse($contractPath, 'Generate HTTP contract artifacts before running PHP tests.');

        /** @var array{enums: array<string, list<string>>} $manifest */
        $manifest = json_decode((string) file_get_contents($contractPath), true, flags: JSON_THROW_ON_ERROR);
        $implemented = array_map(fn (TaskState $state): string => $state->value, TaskState::cases());

        $this->assertEqualsCanonicalizing($manifest['enums']['TaskState'], $implemented);
    }

    private function belongsToContract(string $uri): bool
    {
        return (str_starts_with($uri, 'api/') && $uri !== 'api/broadcasting/auth')
            || $uri === 'sanctum/csrf-cookie';
    }

    private function normalizePath(string $path): string
    {
        return preg_replace('/\{[^}]+\}/', '{}', $path) ?? $path;
    }
}
