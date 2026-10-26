<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Role;

class GrantAdmin extends Command
{
    protected $signature = 'app:grant-admin {email : Email of the user to promote}';

    protected $description = 'Grant the admin role to an existing user';

    public function handle(): int
    {
        $email = $this->argument('email');

        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            $this->error("No user found with email {$email}.");

            return self::FAILURE;
        }

        $user->syncRoles([Role::findOrCreate('admin')]);

        $this->info("Granted the admin role to {$email}.");

        return self::SUCCESS;
    }
}
