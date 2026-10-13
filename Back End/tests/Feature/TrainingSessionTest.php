<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrainingSessionTest extends TestCase
{
    use RefreshDatabase;

    private function sessionPayload(int $courseId): array
    {
        return [
            'course_id'    => $courseId,
            'title'        => 'Test Session',
            'starts_at'    => now()->addDay()->toDateTimeString(),
            'ends_at'      => now()->addDay()->addHours(3)->toDateTimeString(),
            'location'     => 'Room A',
            'max_attendees'=> 20,
            'status'       => 'scheduled',
        ];
    }

    // ---------------------------------------------------------------- index

    public function test_admin_sees_all_sessions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $i1    = User::factory()->create(['role' => 'instructor']);
        $i2    = User::factory()->create(['role' => 'instructor']);
        $c1    = Course::factory()->create(['instructor_id' => $i1->id]);
        $c2    = Course::factory()->create(['instructor_id' => $i2->id]);

        TrainingSession::factory()->create(['course_id' => $c1->id]);
        TrainingSession::factory()->create(['course_id' => $c2->id]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/training-sessions?per_page=200')
            ->assertStatus(200)
            ->assertJsonPath('total', 2);
    }

    public function test_instructor_only_sees_own_courses_sessions(): void
    {
        $i1 = User::factory()->create(['role' => 'instructor']);
        $i2 = User::factory()->create(['role' => 'instructor']);
        $c1 = Course::factory()->create(['instructor_id' => $i1->id]);
        $c2 = Course::factory()->create(['instructor_id' => $i2->id]);

        TrainingSession::factory()->create(['course_id' => $c1->id, 'title' => 'Mine']);
        TrainingSession::factory()->create(['course_id' => $c2->id, 'title' => 'Theirs']);

        $response = $this->actingAs($i1, 'sanctum')
            ->getJson('/api/training-sessions?per_page=200')
            ->assertStatus(200);

        $this->assertEquals(1, $response->json('total'));
        $this->assertEquals('Mine', $response->json('data.0.title'));
    }

    // ---------------------------------------------------------------- store

    public function test_instructor_can_create_session_on_own_course(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $course     = Course::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor, 'sanctum')
            ->postJson('/api/training-sessions', $this->sessionPayload($course->id))
            ->assertStatus(201)
            ->assertJsonFragment(['title' => 'Test Session']);
    }

    public function test_instructor_cannot_create_session_on_another_instructors_course(): void
    {
        $owner      = User::factory()->create(['role' => 'instructor']);
        $other      = User::factory()->create(['role' => 'instructor']);
        $course     = Course::factory()->create(['instructor_id' => $owner->id]);

        $this->actingAs($other, 'sanctum')
            ->postJson('/api/training-sessions', $this->sessionPayload($course->id))
            ->assertStatus(403);
    }

    public function test_admin_can_create_session_on_any_course(): void
    {
        $admin      = User::factory()->create(['role' => 'admin']);
        $instructor = User::factory()->create(['role' => 'instructor']);
        $course     = Course::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/training-sessions', $this->sessionPayload($course->id))
            ->assertStatus(201);
    }

    // ---------------------------------------------------------------- update

    public function test_instructor_can_update_session_on_own_course(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $course     = Course::factory()->create(['instructor_id' => $instructor->id]);
        $session    = TrainingSession::factory()->create(['course_id' => $course->id]);

        $this->actingAs($instructor, 'sanctum')
            ->putJson("/api/training-sessions/{$session->id}", ['title' => 'Renamed'])
            ->assertStatus(200)
            ->assertJsonFragment(['title' => 'Renamed']);
    }

    public function test_instructor_cannot_update_session_on_another_instructors_course(): void
    {
        $owner   = User::factory()->create(['role' => 'instructor']);
        $other   = User::factory()->create(['role' => 'instructor']);
        $course  = Course::factory()->create(['instructor_id' => $owner->id]);
        $session = TrainingSession::factory()->create(['course_id' => $course->id]);

        $this->actingAs($other, 'sanctum')
            ->putJson("/api/training-sessions/{$session->id}", ['title' => 'Hijacked'])
            ->assertStatus(403);
    }

    // ---------------------------------------------------------------- delete

    public function test_instructor_can_delete_session_on_own_course(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $course     = Course::factory()->create(['instructor_id' => $instructor->id]);
        $session    = TrainingSession::factory()->create(['course_id' => $course->id]);

        $this->actingAs($instructor, 'sanctum')
            ->deleteJson("/api/training-sessions/{$session->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('training_sessions', ['id' => $session->id]);
    }

    public function test_instructor_cannot_delete_session_on_another_instructors_course(): void
    {
        $owner   = User::factory()->create(['role' => 'instructor']);
        $other   = User::factory()->create(['role' => 'instructor']);
        $course  = Course::factory()->create(['instructor_id' => $owner->id]);
        $session = TrainingSession::factory()->create(['course_id' => $course->id]);

        $this->actingAs($other, 'sanctum')
            ->deleteJson("/api/training-sessions/{$session->id}")
            ->assertStatus(403);
    }

    public function test_student_cannot_access_training_sessions(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/training-sessions')
            ->assertStatus(403);
    }
}
