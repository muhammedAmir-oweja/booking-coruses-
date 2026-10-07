<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEnrollmentRequest;
use App\Http\Requests\UpdateEnrollmentRequest;
use App\Models\Course;
use App\Models\Enrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EnrollmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Enrollment::with(['student', 'course']);

        // Students see their own enrollments; instructors see the ones on their
        // own courses. Same reason as the other two lists.
        if ($request->user()->isStudent()) {
            $query->where('student_id', $request->user()->student?->id);
        } elseif ($request->user()->isInstructor()) {
            $query->whereHas('course', fn ($q) => $q->where('instructor_id', $request->user()->id));
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) $request->get('per_page', 10), 200);
        $enrollments = $query->latest()->paginate($perPage);
        $enrollments->getCollection()->transform(fn ($e) => $this->format($e));

        return response()->json($enrollments);
    }

    public function show(Enrollment $enrollment): JsonResponse
    {
        $enrollment->load(['student', 'course']);

        return response()->json($this->format($enrollment));
    }

    public function store(StoreEnrollmentRequest $request): JsonResponse
    {
        $data = $request->validated();

        $data['enrolled_at'] = $data['enrolled_at'] ?? now()->toDateString();
        $data['status'] = $data['status'] ?? 'confirmed';

        // One source of truth for "is this bookable", shared with BookingController
        // and with the courses API. 422 so the SPA shows it as a field error.
        $course = Course::findOrFail($data['course_id']);

        if (! course_is_available($course)) {
            throw ValidationException::withMessages([
                'course_id' => [__('bookings.course_full')],
            ]);
        }

        $enrollment = Enrollment::create($data);
        $enrollment->load(['student', 'course']);

        return response()->json($this->format($enrollment), 201);
    }

    public function update(UpdateEnrollmentRequest $request, Enrollment $enrollment): JsonResponse
    {
        $data = $request->validated();

        $enrollment->update($data);
        $enrollment->load(['student', 'course']);

        return response()->json($this->format($enrollment));
    }

    public function destroy(Enrollment $enrollment): JsonResponse
    {
        $enrollment->delete();

        return response()->json(['message' => __('messages.deleted', [
            'model' => __('messages.models.enrollment'),
        ])]);
    }

    private function format(Enrollment $e): array
    {
        return [
            'id' => $e->id,
            'student_id' => $e->student_id,
            'course_id' => $e->course_id,
            'student' => $e->student ? [
                'id' => $e->student->id,
                'name' => $e->student->name,
                'email' => $e->student->email,
            ] : null,
            'course' => $e->course ? [
                'id' => $e->course->id,
                'title' => $e->course->title,
            ] : null,
            'enrolled_at' => $e->enrolled_at?->toDateString(),
            'status' => $e->status,
            'created_at' => $e->created_at,
        ];
    }
}
