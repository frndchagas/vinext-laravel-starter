<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\PasswordUpdateResponse as PasswordUpdateResponseContract;
use Symfony\Component\HttpFoundation\Response;

final class PasswordUpdateResponse implements PasswordUpdateResponseContract
{
    public function toResponse($request): Response
    {
        Auth::guard(config('fortify.guard', 'web'))->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return $request->wantsJson()
            ? new JsonResponse('', 200)
            : redirect('/login');
    }
}
