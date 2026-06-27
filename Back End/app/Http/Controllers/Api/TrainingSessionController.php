<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainingSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainingSessionController extends Controller
{
    /**
     * GET /api/training-sessions
     * Optionally filter by course_id, search by title.
     */
    public function index(Request $request): JsonResponse
    {
        $query = TrainingSession::with('course');

        // Instructors only see sessions for their own courses
        if ($request->user()?->role === 'instructor') {
            $query->whereHas('course', fn($q) => $q->where('instructor_id', $request->user()->id));
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) $request->get('per_page', 10), 200);
        $sessions = $query->orderBy('starts_at')->paginate($perPage);

        $sessions->getCollection()->transform(fn($s) => $this->format($s));

        return response()->json($sessions);
    }

    /**
     * GET /api/training-sessions/{id}
     */
    public function show(TrainingSession $trainingSession): JsonResponse
    {
        $trainingSession->load('course');
        return response()->json($this->format($trainingSession));
    }

    /**
     * POST /api/training-sessions
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'course_id'     => ['required', 'exists:courses,id'],
            'title'         => ['required', 'string', 'max:255'],
            'description'   => ['nullable', 'string'],
            'starts_at'     => ['required', 'date'],
            'ends_at'       => ['required', 'date', 'after:starts_at'],
            'location'      => ['nullable', 'string', 'max:255'],
            'max_attendees' => ['nullable', 'integer', 'min:1'],
            'status'        => ['required', 'in:scheduled,ongoing,completed,cancelled'],
        ]);

        $session = TrainingSession::create($data);
        $session->load('course');

        return response()->json($this->format($session), 201);
    }

    /**
     * PUT /api/training-sessions/{id}
     */
    public function update(Request $request, TrainingSession $trainingSession): JsonResponse
    {
        // Instructors can only edit sessions for their own courses
        if ($request->user()?->role === 'instructor') {
            $trainingSession->load('course');
            if ($trainingSession->course?->instructor_id !== $request->user()->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        $data = $request->validate([
            'course_id'     => ['sometimes', 'exists:courses,id'],
            'title'         => ['sometimes', 'string', 'max:255'],
            'description'   => ['nullable', 'string'],
            'starts_at'     => ['sometimes', 'date'],
            'ends_at'       => ['sometimes', 'date', 'after:starts_at'],
            'location'      => ['nullable', 'string', 'max:255'],
            'max_attendees' => ['nullable', 'integer', 'min:1'],
            'status'        => ['sometimes', 'in:scheduled,ongoing,completed,cancelled'],
        ]);

        $trainingSession->update($data);
        $trainingSession->load('course');

        return response()->json($this->format($trainingSession));
    }

    /**
     * DELETE /api/training-sessions/{id}
     */
    public function destroy(TrainingSession $trainingSession): JsonResponse
    {
        $trainingSession->delete();
        return response()->json(['message' => 'Training session deleted successfully.']);
    }

    private function format(TrainingSession $s): array
    {
        return [
            'id'            => $s->id,
            'course_id'     => $s->course_id,
            'course'        => $s->course ? [
                'id'    => $s->course->id,
                'title' => $s->course->title,
            ] : null,
            'title'         => $s->title,
            'description'   => $s->description,
            'starts_at'     => $s->starts_at?->toDateTimeString(),
            'ends_at'       => $s->ends_at?->toDateTimeString(),
            'duration_minutes' => ($s->starts_at && $s->ends_at) ? $s->duration_minutes : null,
            'location'      => $s->location,
            'max_attendees' => $s->max_attendees,
            'status'        => $s->status,
            'created_at'    => $s->created_at,
        ];
    }
}
