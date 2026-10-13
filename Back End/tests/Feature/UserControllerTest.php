<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    // ---------------------------------------------------------------- store

    public function test_admin_can_create_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/users', [
                'name'                  => 'New Instructor',
                'email'                 => 'new@example.com',
                'password'              => 'Password1!',
                'password_confirmation' => 'Password1!',
                'role'                  => 'instructor',
            ])
            ->assertStatus(201)
            ->assertJsonFragment(['email' => 'new@example.com', 'role' => 'instructor']);
    }

    public function test_created_user_password_is_not_double_hashed(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/users', [
                'name'                  => 'Test User',
                'email'                 => 'tester@example.com',
                'password'              => 'SecurePass1',
                'password_confirmation' => 'SecurePass1',
                'role'                  => 'student',
            ])
            ->assertStatus(201);

        $user = User::where('email', 'tester@example.com')->firstOrFail();

        // If the password were double-hashed, Hash::check() would return false
        // because the stored value would be a bcrypt of a bcrypt string.
        $this->assertTrue(
            Hash::check('SecurePass1', $user->password),
            'Password is double-hashed: Hash::make() was called before the hashed cast'
        );
    }

    public function test_student_cannot_create_user(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/users', [
                'name'                  => 'Hacker',
                'email'                 => 'hack@example.com',
                'password'              => 'Password1!',
                'password_confirmation' => 'Password1!',
                'role'                  => 'admin',
            ])
            ->assertStatus(403);
    }

    // ---------------------------------------------------------------- update

    public function test_admin_can_update_user_role(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'student']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/users/{$target->id}", ['role' => 'instructor'])
            ->assertStatus(200)
            ->assertJsonFragment(['role' => 'instructor']);
    }

    // ---------------------------------------------------------------- destroy

    public function test_admin_can_delete_user(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'instructor']);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/users/{$target->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }
}
