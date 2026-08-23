<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\EmailAddressChanged;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ProfileSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_update_their_name_without_losing_verification(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/auth/user/profile-information', [
                'name' => 'Updated Name',
                'email' => $user->email,
            ])
            ->assertOk();

        $user->refresh();
        $this->assertSame('Updated Name', $user->name);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_profile_updates_still_validate_a_missing_email(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/auth/user/profile-information', [
                'name' => 'Updated Name',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_changing_email_requires_verification_again(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'original@example.com',
            'password' => Hash::make('current-password'),
        ]);

        $this->actingAs($user)
            ->putJson('/api/v1/auth/user/profile-information', [
                'name' => $user->name,
                'email' => 'updated@example.com',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->actingAs($user)
            ->putJson('/api/v1/auth/user/profile-information', [
                'name' => $user->name,
                'email' => 'updated@example.com',
                'current_password' => 'wrong-password',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->assertSame('original@example.com', $user->refresh()->email);

        $this->actingAs($user)
            ->putJson('/api/v1/auth/user/profile-information', [
                'name' => $user->name,
                'email' => 'updated@example.com',
                'current_password' => 'current-password',
            ])
            ->assertOk();

        $user->refresh();
        $this->assertSame('updated@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);
        Notification::assertSentOnDemand(
            EmailAddressChanged::class,
            fn (EmailAddressChanged $notification, array $channels, AnonymousNotifiable $notifiable): bool => $channels === ['mail']
                && $notifiable->routeNotificationFor('mail') === 'original@example.com',
        );
    }

    public function test_a_user_can_change_their_password_with_the_current_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('current-password'),
        ]);

        $this->actingAs($user)
            ->putJson('/api/v1/auth/user/password', [
                'current_password' => 'wrong-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->assertAuthenticatedAs($user);

        $this->actingAs($user)
            ->putJson('/api/v1/auth/user/password', [
                'current_password' => 'current-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->refresh()->password));
        $this->assertGuest();
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }
}
