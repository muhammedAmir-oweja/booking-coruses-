<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    // ---------------------------------------------------------------- login

    public function test_valid_credentials_return_token_and_user(): void
    {
        $user = User::factory()->create(['password' => bcrypt('Password1')]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'Password1',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user' => ['id', 'email', 'role']]);
    }

    public function test_wrong_password_returns_422(): void
    {
        $user = User::factory()->create(['password' => bcrypt('CorrectPass1')]);

        $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'WrongPass',
        ])->assertStatus(422);
    }

    public function test_login_is_rate_limited(): void
    {
        $user = User::factory()->create();

        // Exhaust the per-email limit (5 per minute).
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email'    => $user->email,
                'password' => 'WrongPass',
            ]);
        }

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'WrongPass',
        ]);

        $response->assertStatus(429);
    }

    // --------------------------------------------------------------- register

    public function test_register_creates_user_and_returns_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Test User',
            'email'                 => 'test@example.com',
            'password'              => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['token', 'user' => ['id', 'role']]);

        $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
    }

    public function test_registering_as_student_creates_linked_student_row(): void
    {
        $this->postJson('/api/auth/register', [
            'name'                  => 'Student One',
            'email'                 => 'stu@example.com',
            'password'              => 'Password1!',
            'password_confirmation' => 'Password1!',
            'role'                  => 'student',
        ])->assertStatus(201);

        $this->assertDatabaseHas('students', ['email' => 'stu@example.com']);

        $user    = User::where('email', 'stu@example.com')->first();
        $student = Student::where('email', 'stu@example.com')->first();
        $this->assertEquals($user->id, $student->user_id);
    }

    public function test_duplicate_email_registration_returns_422(): void
    {
        User::factory()->create(['email' => 'dupe@example.com']);

        $this->postJson('/api/auth/register', [
            'name'                  => 'Another',
            'email'                 => 'dupe@example.com',
            'password'              => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertStatus(422);
    }

    // ---------------------------------------------------------------- logout / me

    public function test_unauthenticated_api_request_without_accept_header_returns_json_401(): void
    {
        $this->get('/api/auth/me')
            ->assertUnauthorized()
            ->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertStatus(200)
            ->assertJsonFragment(['email' => $user->email]);
    }

    public function test_logout_revokes_access_and_refresh_tokens(): void
    {
        $user = User::factory()->create();
        $accessToken = $user->createToken('access', ['access'])->plainTextToken;
        $refreshToken = $user->createToken('refresh', ['refresh'])->plainTextToken;

        $this->withToken($accessToken)
            ->postJson('/api/auth/logout')
            ->assertStatus(200);

        $this->assertDatabaseEmpty('personal_access_tokens');

        $this->withToken($refreshToken)
            ->postJson('/api/auth/refresh')
            ->assertUnauthorized();
    }
}
