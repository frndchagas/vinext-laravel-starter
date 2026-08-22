<?php

use App\Http\Middleware\EnsureCorrelationId;
use App\Http\Middleware\ThrottlePasswordReset;
use App\Http\Middleware\ThrottleRegistration;
use App\Support\ProblemDetails;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['prefix' => 'api', 'middleware' => ['api', 'auth:sanctum']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->statefulApi();
        $middleware->redirectGuestsTo('/login');
        $middleware->api(append: EnsureCorrelationId::class);
        $middleware->web(append: [
            EnsureCorrelationId::class,
            ThrottleRegistration::class,
            ThrottlePasswordReset::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(ProblemDetails::render(...));
    })->create();
