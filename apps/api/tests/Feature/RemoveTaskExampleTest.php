<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class RemoveTaskExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_existing_example_data_is_removed_without_deleting_identity_data(): void
    {
        (require database_path('migrations/2026_08_20_120000_create_tasks_table.php'))->up();
        (require database_path('migrations/2026_08_20_120001_create_idempotency_keys_table.php'))->up();
        (require database_path('migrations/2026_08_20_130000_add_processing_token_to_tasks_table.php'))->up();

        $user = User::factory()->create();
        $token = $user->createToken('migration-test');
        $taskId = (string) Str::uuid();
        DB::table('tasks')->insert([
            'id' => $taskId,
            'user_id' => $user->id,
            'input' => 'legacy example',
            'correlation_id' => (string) Str::uuid(),
        ]);
        DB::table('idempotency_keys')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'operation' => 'tasks.create',
            'key' => 'legacy-example',
            'payload_hash' => hash('sha256', 'legacy example'),
            'resource_id' => $taskId,
            'response_status' => 202,
            'response_body' => '{}',
        ]);

        $migration = require database_path('migrations/2026_10_21_230000_remove_task_example_tables.php');
        $migration->up();

        $this->assertFalse(Schema::hasTable('tasks'));
        $this->assertFalse(Schema::hasTable('idempotency_keys'));
        $this->assertDatabaseHas('users', ['id' => $user->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $token->accessToken->id]);

        $migration->down();
        $this->assertDatabaseCount('tasks', 0);
        $this->assertDatabaseCount('idempotency_keys', 0);
        $this->assertTrue(Schema::hasColumn('tasks', 'processing_token'));
        $migration->up();
    }
}
