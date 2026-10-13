<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Course;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    private function makeCourse(array $attrs = []): Course
    {
        return Course::factory()->create(array_merge([
            'status'   => 'active',
            'capacity' => 10,
            'end_date' => now()->addMonth()->toDateString(),
        ], $attrs));
    }

    private function makeStudent(?User $user = null): Student
    {
        $user ??= User::factory()->create(['role' => 'student']);

        return Student::factory()->create(['user_id' => $user->id]);
    }

    // ---------------------------------------------------------------- index

    public function test_admin_sees_all_bookings(): void
    {
        $admin   = User::factory()->create(['role' => 'admin']);
        $course  = $this->makeCourse();
        $student = $this->makeStudent();

        Booking::factory()->count(3)->create(['course_id' => $course->id, 'student_id' => $student->id]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/bookings')
            ->assertStatus(200)
            ->assertJsonPath('total', 3);
    }

    public function test_student_sees_only_own_bookings(): void
    {
        $userA    = User::factory()->create(['role' => 'student']);
        $userB    = User::factory()->create(['role' => 'student']);
        $studentA = $this->makeStudent($userA);
        $studentB = $this->makeStudent($userB);
        $course   = $this->makeCourse();

        Booking::factory()->create(['student_id' => $studentA->id, 'course_id' => $course->id, 'user_id' => $userA->id]);
        Booking::factory()->create(['student_id' => $studentB->id, 'course_id' => $course->id, 'user_id' => $userB->id]);

        $response = $this->actingAs($userA, 'sanctum')
            ->getJson('/api/bookings')
            ->assertStatus(200);

        // Student A sees only their 1 booking, not student B's.
        $this->assertEquals(1, $response->json('total'));
        $ids = collect($response->json('data'))->pluck('student_id');
        $this->assertTrue($ids->every(fn ($id) => $id === $studentA->id));
    }

    // ---------------------------------------------------------------- store

    public function test_student_can_book_own_student_record(): void
    {
        $user    = User::factory()->create(['role' => 'student']);
        $student = $this->makeStudent($user);
        $course  = $this->makeCourse();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/bookings', [
                'student_id' => $student->id,
                'course_id'  => $course->id,
                'amount'     => $course->price,
            ])
            ->assertStatus(201)
            ->assertJsonFragment(['student_id' => $student->id]);
    }

    public function test_student_cannot_book_for_another_student(): void
    {
        $user    = User::factory()->create(['role' => 'student']);
        $this->makeStudent($user);                           // own student row
        $other   = $this->makeStudent();                     // someone else's
        $course  = $this->makeCourse();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/bookings', [
                'student_id' => $other->id,
                'course_id'  => $course->id,
                'amount'     => $course->price,
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.student_id.0', __('bookings.only_self'));
    }

    public function test_booking_full_course_is_rejected(): void
    {
        $user    = User::factory()->create(['role' => 'student']);
        $student = $this->makeStudent($user);
        // capacity 0 means immediately full
        $course  = $this->makeCourse(['capacity' => 0]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/bookings', [
                'student_id' => $student->id,
                'course_id'  => $course->id,
                'amount'     => $course->price,
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.course_id.0', __('bookings.course_full'));
    }

    public function test_instructor_cannot_create_booking(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student    = $this->makeStudent();
        $course     = $this->makeCourse();

        $this->actingAs($instructor, 'sanctum')
            ->postJson('/api/bookings', [
                'student_id' => $student->id,
                'course_id'  => $course->id,
                'amount'     => $course->price,
            ])
            ->assertStatus(403);
    }

    // --------------------------------------------------------- updateStatus

    public function test_admin_can_update_booking_status(): void
    {
        $admin   = User::factory()->create(['role' => 'admin']);
        $course  = $this->makeCourse();
        $student = $this->makeStudent();

        $booking = Booking::factory()->create([
            'course_id'      => $course->id,
            'student_id'     => $student->id,
            'status'         => 'pending',
            'payment_status' => 'unpaid',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/bookings/{$booking->id}/status", [
                'status'         => 'confirmed',
                'payment_status' => 'paid',
            ])
            ->assertStatus(200)
            ->assertJsonFragment(['status' => 'confirmed']);
    }

    public function test_student_cannot_update_booking_status(): void
    {
        $user    = User::factory()->create(['role' => 'student']);
        $student = $this->makeStudent($user);
        $course  = $this->makeCourse();

        $booking = Booking::factory()->create([
            'course_id'  => $course->id,
            'student_id' => $student->id,
            'user_id'    => $user->id,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/bookings/{$booking->id}/status", ['status' => 'confirmed'])
            ->assertStatus(403);
    }

    // --------------------------------------------------------- duplicate guard

    public function test_student_cannot_book_same_course_twice(): void
    {
        $user    = User::factory()->create(['role' => 'student']);
        $student = $this->makeStudent($user);
        $course  = $this->makeCourse();

        // First booking succeeds.
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/bookings', [
                'student_id' => $student->id,
                'course_id'  => $course->id,
                'amount'     => $course->price,
            ])
            ->assertStatus(201);

        // Second booking for the same course must be rejected.
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/bookings', [
                'student_id' => $student->id,
                'course_id'  => $course->id,
                'amount'     => $course->price,
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.course_id.0', fn ($msg) => str_contains($msg, 'taken') || str_contains($msg, 'already'));
    }
}
