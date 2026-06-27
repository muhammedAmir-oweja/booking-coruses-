<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EnrollmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Enrollment::with(['student', 'course']);

        if ($request->user()?->role === 'student') {
            $student = \App\Models\Student::where('user_id', $request->user()->id)->first();
            $query->where('student_id', $student?->id ?? 0);
        }

        if ($request->user()?->role === 'instructor') {
            $query->whereHas('course', fn($q) => $q->where('instructor_id', $request->user()->id));
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
        $enrollments->getCollection()->transform(fn($e) => $this->format($e));

        return response()->json($enrollments);
    }

    public function show(Enrollment $enrollment): JsonResponse
    {
        $enrollment->load(['student', 'course']);
        return response()->json($this->format($enrollment));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id'  => ['required', 'exists:students,id'],
            'course_id'   => [
                'required',
                'exists:courses,id',
                Rule::unique('enrollments')->where(fn($q) => $q->where('student_id', $request->student_id)),
            ],
            'enrolled_at' => ['nullable', 'date'],
            'status'      => ['sometimes', 'in:pending,confirmed,cancelled'],
        ]);

        $data['enrolled_at'] = $data['enrolled_at'] ?? now()->toDateString();
        $data['status'] = $data['status'] ?? 'confirmed';

        $enrollment = Enrollment::create($data);
        $enrollment->load(['student', 'course']);

        return response()->json($this->format($enrollment), 201);
    }

    public function update(Request $request, Enrollment $enrollment): JsonResponse
    {
        $data = $request->validate([
            'status'      => ['sometimes', 'in:pending,confirmed,cancelled'],
            'enrolled_at' => ['sometimes', 'date'],
        ]);

        $enrollment->update($data);
        $enrollment->load(['student', 'course']);

        return response()->json($this->format($enrollment));
    }

    public function destroy(Enrollment $enrollment): JsonResponse
    {
        $enrollment->delete();
        return response()->json(['message' => 'Enrollment deleted successfully.']);
    }

    private function format(Enrollment $e): array
    {
        return [
            'id'          => $e->id,
            'student_id'  => $e->student_id,
            'course_id'   => $e->course_id,
            'student'     => $e->student ? [
                'id'    => $e->student->id,
                'name'  => $e->student->name,
                'email' => $e->student->email,
            ] : null,
            'course'      => $e->course ? [
                'id'    => $e->course->id,
                'title' => $e->course->title,
            ] : null,
            'enrolled_at' => $e->enrolled_at?->toDateString(),
            'status'      => $e->status,
            'created_at'  => $e->created_at,
        ];
    }
}
