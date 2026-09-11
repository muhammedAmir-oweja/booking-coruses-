<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Course::with('instructor')
            ->withCount('enrollments');

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->search.'%');
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) $request->get('per_page', 10), 200);
        $courses = $query->latest()->paginate($perPage);

        $courses->getCollection()->transform(fn ($c) => $this->format($c));

        return response()->json($courses);
    }

    public function show(Course $course): JsonResponse
    {
        $course->loadCount('enrollments');
        $course->load('instructor');

        return response()->json($this->format($course));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'instructor_id' => ['required', 'exists:users,id'],
            'price' => ['required', 'numeric', 'min:0'],
            'capacity' => ['required', 'integer', 'min:1'],
            'hours' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', 'in:draft,active,inactive'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
        ]);

        $course = Course::create($data);
        $course->loadCount('enrollments');
        $course->load('instructor');

        return response()->json($this->format($course), 201);
    }

    public function update(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'instructor_id' => ['sometimes', 'exists:users,id'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'capacity' => ['sometimes', 'integer', 'min:1'],
            'hours' => ['nullable', 'integer', 'min:0'],
            'status' => ['sometimes', 'in:draft,active,inactive'],
            'start_date' => ['sometimes', 'date'],
            // `after:start_date` reads the request body, so on a partial update
            // that omits start_date it has nothing to compare and silently
            // passes. Fall back to the stored value.
            'end_date' => ['nullable', 'date', function ($attribute, $value, $fail) use ($request, $course) {
                $start = $request->input('start_date', $course->start_date?->toDateString());

                if ($start && $value && strtotime($value) <= strtotime($start)) {
                    $fail('The end date must be after the start date.');
                }
            }],
        ]);

        $course->update($data);
        $course->loadCount('enrollments');
        $course->load('instructor');

        return response()->json($this->format($course));
    }

    public function destroy(Course $course): JsonResponse
    {
        $course->delete();

        return response()->json(['message' => 'Course deleted successfully.']);
    }

    private function format(Course $course): array
    {
        return [
            'id' => $course->id,
            'title' => $course->title,
            'description' => $course->description,
            'instructor_id' => $course->instructor_id,
            'instructor' => $course->instructor ? [
                'id' => $course->instructor->id,
                'name' => $course->instructor->name,
            ] : null,
            'price' => (float) $course->price,
            'capacity' => $course->capacity,
            'hours' => $course->hours ?? 0,
            'enrolled_count' => $course->enrollments_count ?? 0,
            'status' => $course->status,
            'start_date' => $course->start_date?->toDateString(),
            'end_date' => $course->end_date?->toDateString(),
            'created_at' => $course->created_at,
        ];
    }
}
