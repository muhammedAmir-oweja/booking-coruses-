<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseTest extends TestCase
{
    use RefreshDatabase;

    private function coursePayload(int $instructorId): array
    {
        return [
            'title'         => 'Test Course',
            'description'   => 'A description',
            'instructor_id' => $instructorId,
            'price'         => 199,
            'capacity'      => 20,
            'hours'         => 30,
            'status'        => 'active',
            'start_date'    => now()->addDay()->toDateString(),
            'end_date'      => now()->addMonth()->toDateString(),
        ];
    }

    // ---------------------------------------------------------------- index

    public function test_any_authenticated_user_can_list_courses(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        Course::factory()->count(3)->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/courses')
            ->assertStatus(200)
            ->assertJsonStructure(['data', 'total']);
    }

    public function test_guest_cannot_list_courses(): void
    {
        $this->getJson('/api/courses')->assertStatus(401);
    }

    public function test_instructor_only_sees_own_courses(): void
    {
        $instructor  = User::factory()->create(['role' => 'instructor']);
        $other       = User::factory()->create(['role' => 'instructor']);

        Course::factory()->create(['instructor_id' => $instructor->id, 'title' => 'Mine']);
        Course::factory()->create(['instructor_id' => $other->id,      'title' => 'Theirs']);

        $response = $this->actingAs($instructor, 'sanctum')
            ->getJson('/api/courses?per_page=200')
            ->assertStatus(200);

        $titles = collect($response->json('data'))->pluck('title')->toArray();
        $this->assertContains('Mine',   $titles);
        $this->assertNotContains('Theirs', $titles);
    }

    // ---------------------------------------------------------------- store

    public function test_admin_can_create_course(): void
    {
        $admin      = User::factory()->create(['role' => 'admin']);
        $instructor = User::factory()->create(['role' => 'instructor']);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/courses', $this->coursePayload($instructor->id))
            ->assertStatus(201)
            ->assertJsonFragment(['title' => 'Test Course']);
    }

    public function test_instructor_can_create_course(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        $this->actingAs($instructor, 'sanctum')
            ->postJson('/api/courses', $this->coursePayload($instructor->id))
            ->assertStatus(201);
    }

    public function test_student_cannot_create_course(): void
    {
        $student    = User::factory()->create(['role' => 'student']);
        $instructor = User::factory()->create(['role' => 'instructor']);

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/courses', $this->coursePayload($instructor->id))
            ->assertStatus(403);
    }

    // ---------------------------------------------------------------- update

    public function test_instructor_can_update_own_course(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $course     = Course::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor, 'sanctum')
            ->putJson("/api/courses/{$course->id}", ['title' => 'Updated', 'status' => 'active'])
            ->assertStatus(200)
            ->assertJsonFragment(['title' => 'Updated']);
    }

    public function test_instructor_cannot_update_another_instructors_course(): void
    {
        $owner = User::factory()->create(['role' => 'instructor']);
        $other = User::factory()->create(['role' => 'instructor']);
        $course = Course::factory()->create(['instructor_id' => $owner->id]);

        $this->actingAs($other, 'sanctum')
            ->putJson("/api/courses/{$course->id}", ['title' => 'Hijacked'])
            ->assertStatus(403);
    }

    // ---------------------------------------------------------------- delete

    public function test_admin_can_delete_any_course(): void
    {
        $admin  = User::factory()->create(['role' => 'admin']);
        $course = Course::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/courses/{$course->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('courses', ['id' => $course->id]);
    }

    public function test_instructor_cannot_delete_another_instructors_course(): void
    {
        $owner = User::factory()->create(['role' => 'instructor']);
        $other = User::factory()->create(['role' => 'instructor']);
        $course = Course::factory()->create(['instructor_id' => $owner->id]);

        $this->actingAs($other, 'sanctum')
            ->deleteJson("/api/courses/{$course->id}")
            ->assertStatus(403);
    }
}
