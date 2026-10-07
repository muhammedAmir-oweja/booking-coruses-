<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Course::with('instructor')
            ->withCount(['enrollments','bookings as active_bookings_count' => fn($q) => $q
                ->whereIn('status', ['pending', 'confirmed']),]);

        // Instructors manage their own catalogue; admins and students see
        // everything. A policy does not filter a list, so it is done here.
        if ($request->user()->isInstructor()) {
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

    public function show(Course $course): JsonResponse
    {
        $course->loadCount([
            'enrollments',
            'bookings as active_bookings_count' => fn ($q) => $q
                ->whereIn('status', ['pending', 'confirmed']),
        ]);
        $course->load('instructor');

        return response()->json($this->format($course));
    }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        $course = Course::create($request->validated());
        $course->loadCount([
            'enrollments',
            'bookings as active_bookings_count' => fn ($q) => $q
                ->whereIn('status', ['pending', 'confirmed']),
        ]);
        $course->load('instructor');

        return response()->json($this->format($course), 201);
    }

    public function update(UpdateCourseRequest $request, Course $course): JsonResponse
    {
        // 403 when it is someone else's course - role:admin,instructor gets an
        // instructor this far, but cannot tell whose course this is.
        $this->authorize('update', $course);

        $data = $request->validated();

        $course->update($data);
        $course->loadCount([
            'enrollments',
            'bookings as active_bookings_count' => fn ($q) => $q
                ->whereIn('status', ['pending', 'confirmed']),
        ]);
        $course->load('instructor');

        return response()->json($this->format($course));
    }

    public function destroy(Course $course): JsonResponse
    {
        $this->authorize('delete', $course);

        $course->delete();

        return response()->json(['message' => __('messages.deleted', [
            'model' => __('messages.models.course'),
        ])]);
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
            'taken_seats' => course_taken_seats($course),
            'remaining_seats' => course_remaining_seats($course),
            'is_available' => course_is_available($course),
            'status' => $course->status,
            'start_date' => $course->start_date?->toDateString(),
            'end_date' => $course->end_date?->toDateString(),
            'created_at' => $course->created_at,
        ];
    }
}
