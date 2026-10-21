<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DeleteAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_current_password_is_required(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->deleteJson('/api/v1/auth/user', ['password' => 'wrong-password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_a_user_can_permanently_delete_their_account_and_owned_resources(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $user = User::factory()->create();
        $user->assignRole('member');
        $token = $user->createToken('delete-test');

        DB::table('password_reset_tokens')->insert([
            'email' => $user->email,
            'token' => 'hashed-token',
            'created_at' => now(),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $this->withHeader('Origin', 'http://localhost')
            ->deleteJson('/api/v1/auth/user', ['password' => 'password'])
            ->assertNoContent();

        $this->getJson('/api/v1/me')->assertUnauthorized();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->assertDatabaseMissing('model_has_roles', ['model_id' => $user->id]);
    }

    public function test_an_unauthenticated_request_cannot_delete_a_user(): void
    {
        $this->deleteJson('/api/v1/auth/user', ['password' => 'password'])->assertUnauthorized();
    }

    public function test_the_last_admin_cannot_delete_their_account(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->deleteJson('/api/v1/auth/user', ['password' => 'password'])
            ->assertConflict()
            ->assertJsonPath('code', 'last_admin');

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
        $this->assertTrue($admin->fresh()->hasRole('admin'));
        $this->getJson('/api/v1/me')->assertOk();
    }
}
