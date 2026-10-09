<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStudentDocumentRequest;
use App\Models\Student;
use App\Models\StudentDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentDocumentController extends Controller
{
    private const DISK = 'student_documents';

    public function index(Student $student): JsonResponse
    {
        $documents = $student->documents()->latest()->get()->map(fn ($d) => $this->format($d));

        return response()->json($documents);
    }

    public function store(StoreStudentDocumentRequest $request, Student $student): JsonResponse
    {

        $file = $request->file('document');

        // Was: $file->store('student-documents', 'public') - one flat,
        // world-readable folder holding every student's documents. Now a folder
        // per student on a disk with no public URL at all.
        $path = $file->store("student-{$student->id}", self::DISK);

        $document = $student->documents()->create([
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'disk' => self::DISK,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json($this->format($document), 201);
    }

    public function download(Student $student, StudentDocument $document): StreamedResponse
    {
        // Nested binding does not verify the parent, same as the course files.
        abort_unless($document->student_id === $student->id, 404);

        $disk = $document->disk ?? 'public';
        abort_unless(Storage::disk($disk)->exists($document->path), 404);

        return Storage::disk($disk)->download($document->path, $document->original_name);
    }

    public function destroy(Student $student, StudentDocument $document): JsonResponse
    {
        if ($document->student_id !== $student->id) {
            return response()->json(['message' => __('messages.document_foreign')], 403);
        }

        // Read the disk off the row, not hardcoded: rows written before this
        // task are still on 'public' and have to delete from there.
        Storage::disk($document->disk ?? 'public')->delete($document->path);
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
            'download_url' => $document->downloadUrl(),
            'mime_type' => $document->mime_type,
            'size' => $document->size,
            'created_at' => $document->created_at,
        ];
    }
}
