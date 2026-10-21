<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('users.{id}', function (User $user, string $id): bool {
    return $user->hasVerifiedEmail() && (string) $user->getKey() === $id;
});
