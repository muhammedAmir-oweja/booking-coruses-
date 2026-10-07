<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStudentDocumentRequest;
use App\Models\Student;
use App\Models\StudentDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudentDocumentController extends Controller
{
    public function index(Student $student): JsonResponse
    {
        $documents = $student->documents()->latest()->get()->map(fn ($d) => $this->format($d));

        return response()->json($documents);
    }

    public function store(StoreStudentDocumentRequest $request, Student $student): JsonResponse
    {

        $file = $request->file('document');
        $path = $file->store('student-documents', 'public');

        $document = $student->documents()->create([
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json($this->format($document), 201);
    }

    public function destroy(Student $student, StudentDocument $document): JsonResponse
    {
        if ($document->student_id !== $student->id) {
            return response()->json(['message' => __('messages.document_foreign')], 403);
        }

        Storage::disk('public')->delete($document->path);
        $document->delete();

        return response()->json(['message' => __('messages.deleted', [
            'model' => __('messages.models.document'),
        ])]);
    }

    private function format(StudentDocument $document): array
    {
        return [
            'id' => $document->id,
            'student_id' => $document->student_id,
            'original_name' => $document->original_name,
            'url' => $document->url,
            'mime_type' => $document->mime_type,
            'size' => $document->size,
            'created_at' => $document->created_at,
        ];
    }
}
