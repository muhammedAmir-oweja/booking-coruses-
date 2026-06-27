<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    /**
     * GET /api/courses
     */
    public function index(Request $request): JsonResponse
    {
        $query = Course::with('instructor')
            ->withCount('enrollments');

        // Instructors only see their own courses
        if ($request->user()?->role === 'instructor') {
            $query->where('instructor_id', $request->user()->id);
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) $request->get('per_page', 10), 200);
        $courses = $query->latest()->paginate($perPage);

        $courses->getCollection()->transform(fn($c) => $this->format($c));

        return response()->json($courses);
    }

    /**
     * GET /api/courses/{id}
     */
    public function show(Course $course): JsonResponse
    {
        $course->loadCount('enrollments');
        $course->load('instructor');

        return response()->json($this->format($course));
    }

    /**
     * POST /api/courses
     */
    public function store(Request $request): JsonResponse
    {
        $isInstructor = $request->user()?->role === 'instructor';

        $data = $request->validate([
            'title'         => ['required', 'string', 'max:255'],
            'description'   => ['nullable', 'string'],
            'instructor_id' => [$isInstructor ? 'sometimes' : 'required', 'exists:users,id'],
            'price'         => ['required', 'numeric', 'min:0'],
            'capacity'      => ['required', 'integer', 'min:1'],
            'hours'         => ['nullable', 'integer', 'min:0'],
            'status'        => ['required', 'in:draft,active,inactive'],
            'start_date'    => ['required', 'date'],
            'end_date'      => ['nullable', 'date', 'after:start_date'],
        ]);

        // Instructors are always assigned as the course instructor
        if ($isInstructor) {
            $data['instructor_id'] = $request->user()->id;
        }

        $course = Course::create($data);
        $course->loadCount('enrollments');
        $course->load('instructor');

        return response()->json($this->format($course), 201);
    }

    /**
     * PUT /api/courses/{id}
     */
    public function update(Request $request, Course $course): JsonResponse
    {
        // Instructors can only edit their own courses
        if ($request->user()?->role === 'instructor' && $course->instructor_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'title'         => ['sometimes', 'string', 'max:255'],
            'description'   => ['nullable', 'string'],
            'instructor_id' => ['sometimes', 'exists:users,id'],
            'price'         => ['sometimes', 'numeric', 'min:0'],
            'capacity'      => ['sometimes', 'integer', 'min:1'],
            'hours'         => ['nullable', 'integer', 'min:0'],
            'status'        => ['sometimes', 'in:draft,active,inactive'],
            'start_date'    => ['sometimes', 'date'],
            'end_date'      => ['nullable', 'date', 'after:start_date'],
        ]);

        $course->update($data);
        $course->loadCount('enrollments');
        $course->load('instructor');

        return response()->json($this->format($course));
    }

    /**
     * DELETE /api/courses/{id}
     */
    public function destroy(Course $course): JsonResponse
    {
        $course->delete();

        return response()->json(['message' => 'Course deleted successfully.']);
    }

    private function format(Course $course): array
    {
        return [
            'id'             => $course->id,
            'title'          => $course->title,
            'description'    => $course->description,
            'instructor_id'  => $course->instructor_id,
            'instructor'     => $course->instructor ? [
                'id'   => $course->instructor->id,
                'name' => $course->instructor->name,
            ] : null,
            'price'          => (float) $course->price,
            'capacity'       => $course->capacity,
            'hours'          => $course->hours ?? 0,
            'enrolled_count' => $course->enrollments_count ?? 0,
            'status'         => $course->status,
            'start_date'     => $course->start_date?->toDateString(),
            'end_date'       => $course->end_date?->toDateString(),
            'created_at'     => $course->created_at,
        ];
    }
}
