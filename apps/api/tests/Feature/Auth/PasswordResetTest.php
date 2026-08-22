<?php

namespace Tests\Feature\Auth;

use App\Http\Responses\PasswordResetLinkResponse;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_link_points_to_the_spa_with_the_token_and_email(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);

        $response->assertOk()->assertExactJson([
            'message' => PasswordResetLinkResponse::MESSAGE,
        ]);
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $url = $notification->toMail($user)->actionUrl;

            $this->assertIsString($url);
            $this->assertStringStartsWith(config('app.url').'/reset-password?', $url);

            parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

            $this->assertSame($notification->token, $query['token'] ?? null);
            $this->assertSame($user->email, $query['email'] ?? null);

            return true;
        });
    }

    public function test_reset_link_requests_do_not_reveal_whether_the_email_exists(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $existing = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);
        $missing = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'missing@example.com']);

        $existing->assertOk();
        $missing->assertOk();
        $this->assertSame($existing->json(), $missing->json());
        $this->assertSame(PasswordResetLinkResponse::MESSAGE, $missing->json('message'));
        Notification::assertCount(1);
    }

    public function test_reset_link_requests_are_rate_limited_by_email_and_ip(): void
    {
        Notification::fake();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/forgot-password', [
                'email' => 'limited@example.com',
            ])->assertOk();
        }

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'limited@example.com',
        ])->assertTooManyRequests()->assertHeader('Retry-After');
    }

    public function test_reset_link_requests_still_validate_email_syntax(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'not-an-email',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_password_can_be_reset_with_a_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
            $response = $this->postJson('/api/v1/auth/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'new-secret-password',
                'password_confirmation' => 'new-secret-password',
            ]);

            $response->assertOk();

            $this->assertTrue(Hash::check('new-secret-password', $user->fresh()->password));

            return true;
        });
    }
}
