<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class ReadinessTest extends TestCase
{
    public function test_readiness_checks_the_database_and_cache(): void
    {
        $correlationId = '123e4567-e89b-42d3-a456-426614174000';

        $this->withHeader('X-Correlation-Id', $correlationId)
            ->getJson('/ready')
            ->assertOk()
            ->assertHeader('X-Correlation-Id', $correlationId)
            ->assertHeaderMissing('Set-Cookie')
            ->assertExactJson([
                'status' => 'ready',
                'checks' => [
                    'database' => 'ok',
                    'cache' => 'ok',
                ],
            ]);
    }

    public function test_readiness_replaces_invalid_correlation_ids(): void
    {
        $response = $this->withHeader('X-Correlation-Id', 'not-a-uuid')->getJson('/ready');
        $correlationId = $response->headers->get('X-Correlation-Id');

        $response
            ->assertOk()
            ->assertHeaderMissing('Set-Cookie');
        $this->assertIsString($correlationId);
        $this->assertTrue(Str::isUuid($correlationId));
        $this->assertNotSame('not-a-uuid', $correlationId);
    }

    public function test_readiness_returns_service_unavailable_when_the_database_fails(): void
    {
        DB::shouldReceive('selectOne')->once()->andThrow(new RuntimeException('database unavailable'));

        $this->getJson('/ready')
            ->assertServiceUnavailable()
            ->assertHeader('X-Correlation-Id')
            ->assertHeaderMissing('Set-Cookie')
            ->assertJsonPath('status', 'unavailable')
            ->assertJsonPath('checks.database', 'unavailable')
            ->assertJsonPath('checks.cache', 'ok');
    }

    public function test_readiness_returns_service_unavailable_when_the_cache_fails(): void
    {
        Cache::shouldReceive('get')->once()->andThrow(new RuntimeException('cache unavailable'));

        $this->getJson('/ready')
            ->assertServiceUnavailable()
            ->assertHeader('X-Correlation-Id')
            ->assertHeaderMissing('Set-Cookie')
            ->assertJsonPath('status', 'unavailable')
            ->assertJsonPath('checks.database', 'ok')
            ->assertJsonPath('checks.cache', 'unavailable');
    }
}
