<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudentDocumentController extends Controller
{
    /**
     * GET /api/students/{student}/documents
     */
    public function index(Student $student): JsonResponse
    {
        $documents = $student->documents()->latest()->get()->map(fn($d) => $this->format($d));

        return response()->json($documents);
    }

    /**
     * POST /api/students/{student}/documents
     */
    public function store(Request $request, Student $student): JsonResponse
    {
        $request->validate([
            'document'  => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,zip'],
        ]);

        $file = $request->file('document');
        $path = $file->store('student-documents', 'public');

        $document = $student->documents()->create([
            'original_name' => $file->getClientOriginalName(),
            'path'          => $path,
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
        ]);

        return response()->json($this->format($document), 201);
    }

    /**
     * DELETE /api/students/{student}/documents/{document}
     */
    public function destroy(Student $student, StudentDocument $document): JsonResponse
    {
        if ($document->student_id !== $student->id) {
            return response()->json(['message' => 'Document does not belong to this student.'], 403);
        }

        Storage::disk('public')->delete($document->path);
        $document->delete();

        return response()->json(['message' => 'Document deleted successfully.']);
    }

    private function format(StudentDocument $document): array
    {
        return [
            'id'            => $document->id,
            'student_id'    => $document->student_id,
            'original_name' => $document->original_name,
            'url'           => $document->url,
            'mime_type'     => $document->mime_type,
            'size'          => $document->size,
            'created_at'    => $document->created_at,
        ];
    }
}
