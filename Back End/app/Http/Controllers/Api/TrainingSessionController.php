<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTrainingSessionRequest;
use App\Http\Requests\UpdateTrainingSessionRequest;
use App\Models\TrainingSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainingSessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = TrainingSession::with('course');

        // Instructors see only sessions that belong to their own courses.
        // Admins see everything; students never reach this route (role gate).
        if ($request->user()->isInstructor()) {
            $query->whereHas('course', fn ($q) => $q->where('instructor_id', $request->user()->id));
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->search.'%');
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) $request->get('per_page', 10), 200);
        $sessions = $query->orderBy('starts_at')->paginate($perPage);

        $sessions->getCollection()->transform(fn ($s) => $this->format($s));

        return response()->json($sessions);
    }

    public function show(TrainingSession $trainingSession): JsonResponse
    {
        $trainingSession->load('course');

        return response()->json($this->format($trainingSession));
    }

    public function store(StoreTrainingSessionRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Ownership already enforced in StoreTrainingSessionRequest::authorize().
        $session = TrainingSession::create($data);
        $session->load('course');

        return response()->json($this->format($session), 201);
    }

    public function update(UpdateTrainingSessionRequest $request, TrainingSession $trainingSession): JsonResponse
    {
        $data = $request->validated();

        $trainingSession->update($data);
        $trainingSession->load('course');

        return response()->json($this->format($trainingSession));
    }

    public function destroy(TrainingSession $trainingSession): JsonResponse
    {
        // Instructors may only delete sessions on their own courses.
        if (request()->user()->isInstructor()
            && $trainingSession->course?->instructor_id !== request()->user()->id) {
            abort(403);
        }

        $trainingSession->delete();

        return response()->json(['message' => __('messages.deleted', [
            'model' => __('messages.models.training_session'),
        ])]);
    }

    private function format(TrainingSession $s): array
    {
        return [
            'id' => $s->id,
            'course_id' => $s->course_id,
            'course' => $s->course ? [
                'id' => $s->course->id,
                'title' => $s->course->title,
            ] : null,
            'title' => $s->title,
            'description' => $s->description,
            'starts_at' => $s->starts_at?->toDateTimeString(),
            'ends_at' => $s->ends_at?->toDateTimeString(),
            'duration_minutes' => ($s->starts_at && $s->ends_at) ? $s->duration_minutes : null,
            'location' => $s->location,
            'max_attendees' => $s->max_attendees,
            'status' => $s->status,
            'created_at' => $s->created_at,
        ];
    }
}
