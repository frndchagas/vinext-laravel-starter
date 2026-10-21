<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('idempotency_keys');
        Schema::dropIfExists('tasks');
    }

    public function down(): void
    {
        // A rollback restores the example schema, not the deleted records.
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->text('input');
            $table->json('output')->nullable();
            $table->string('state', 20)->default('queued')->index();
            $table->uuid('processing_token')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->string('error_code', 100)->nullable();
            $table->uuid('correlation_id');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('operation', 100);
            $table->string('key', 255);
            $table->string('payload_hash', 64);
            $table->uuid('resource_id');
            $table->unsignedSmallInteger('response_status');
            $table->json('response_body');
            $table->timestamps();
            $table->unique(['user_id', 'operation', 'key']);
        });
    }
};
