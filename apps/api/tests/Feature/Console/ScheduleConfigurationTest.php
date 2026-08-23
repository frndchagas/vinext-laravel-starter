<?php

namespace Tests\Feature\Console;

use Illuminate\Console\Scheduling\CacheEventMutex;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Cache\Factory as CacheFactory;
use Tests\TestCase;

class ScheduleConfigurationTest extends TestCase
{
    public function test_scheduled_commands_have_short_mutex_recovery_windows(): void
    {
        $scheduledCommands = [
            'tasks:reconcile' => ['expression' => '* * * * *', 'minutes' => 5],
            'horizon:snapshot' => ['expression' => '*/5 * * * *', 'minutes' => 10],
            'queue:prune-failed --hours=168' => ['expression' => '0 0 * * *', 'minutes' => 60],
        ];
        $events = collect(app(Schedule::class)->events());

        foreach ($scheduledCommands as $command => $configuration) {
            $event = $events->first(
                fn (Event $event): bool => str_contains($event->getSummaryForDisplay(), $command),
            );

            $this->assertInstanceOf(Event::class, $event, "Missing scheduled command: {$command}");
            $this->assertSame($configuration['expression'], $event->expression);
            $this->assertTrue($event->onOneServer, "{$command} must use a shared server mutex.");
            $this->assertTrue($event->withoutOverlapping, "{$command} must reject overlapping runs.");
            $this->assertSame($configuration['minutes'], $event->expiresAt);

            $mutex = (new CacheEventMutex(app(CacheFactory::class)))->useStore('array');
            $event->preventOverlapsUsing($mutex);
            $mutex->forget($event);

            try {
                $this->assertFalse($event->shouldSkipDueToOverlapping(), "{$command} should acquire its first mutex.");
                $this->assertTrue($event->shouldSkipDueToOverlapping(), "{$command} should reject an overlapping run.");

                $this->travel($configuration['minutes'] - 1)->minutes();
                $this->assertTrue($event->shouldSkipDueToOverlapping(), "{$command} released its mutex too early.");

                $this->travel(61)->seconds();
                $this->assertFalse($event->shouldSkipDueToOverlapping(), "{$command} did not recover after its mutex expired.");
            } finally {
                $mutex->forget($event);
                $this->travelBack();
            }
        }
    }
}
