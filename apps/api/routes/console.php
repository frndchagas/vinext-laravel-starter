<?php

use Illuminate\Foundation\DevCommands;
use Illuminate\Support\Facades\Schedule;

DevCommands::artisan(
    'serve --host='.config('development.api_host').' --port='.((int) config('development.api_port')),
    'server',
);

// The web app lives in apps/web and runs through the root Bun command; the "vite"
// process the framework registers for this package.json would recurse
// into `artisan dev` itself.
DevCommands::except('vite');

Schedule::command('tasks:reconcile')
    ->everyMinute()
    ->onOneServer()
    ->withoutOverlapping(5);

Schedule::command('horizon:snapshot')
    ->everyFiveMinutes()
    ->onOneServer()
    ->withoutOverlapping(10);

Schedule::command('queue:prune-failed --hours=168')
    ->daily()
    ->onOneServer()
    ->withoutOverlapping(60);
