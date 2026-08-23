<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Symfony\Component\HttpFoundation\Response;

final class ThrottlePasswordReset
{
    public function __construct(private readonly ThrottleRequests $throttleRequests) {}

    /**
     * Apply the password-reset limiter without changing the other Fortify routes.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->routeIs('password.email')) {
            return $next($request);
        }

        return $this->throttleRequests->handle($request, $next, 'password-reset');
    }
}
