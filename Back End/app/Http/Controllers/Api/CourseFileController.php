<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCourseFileRequest;
use App\Models\Course;
use App\Models\CourseFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CourseFileController extends Controller
{
    private const DISK = 'course_files';

    public function index(Course $course): JsonResponse
    {
        Gate::authorize('view', $course);

        $files = $course->files()->latest()->get()->map(fn ($f) => $this->format($f));

        return response()->json($files);
    }

    public function store(StoreCourseFileRequest $request, Course $course): JsonResponse
    {
        // Only the owning instructor (or an admin) may add to this course - the
        // role group gets an instructor this far, but cannot tell whose course
        // it is.
        Gate::authorize('update', $course);

        $file = $request->file('file');
        $category = $request->validated('category', 'material');

        // store() hashes the name for us, which is what keeps a hostile
        // original_name like ../../.env out of the filesystem. The folder
        // layout is the organization: course-7/material/9f2c....pdf
        $path = $file->store("course-{$course->id}/{$category}", self::DISK);

        $record = $course->files()->create([
            'uploaded_by' => $request->user()->id,
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'disk' => self::DISK,
            'category' => $category,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json($this->format($record), 201);
    }

    public function download(Course $course, CourseFile $file): StreamedResponse
    {
        Gate::authorize('view', $course);

        // Nested binding does not verify the parent: /courses/1/files/99
        // resolves file 99 even if it belongs to course 2.
        abort_unless($file->course_id === $course->id, 404);
        abort_unless(Storage::disk($file->disk)->exists($file->path), 404);

        // Streams from outside the webroot, and restores the real filename.
        return Storage::disk($file->disk)->download($file->path, $file->original_name);
    }

    public function destroy(Course $course, CourseFile $file): JsonResponse
    {
        Gate::authorize('update', $course);
        abort_unless($file->course_id === $course->id, 404);

        // Disk first, row second: a missing file with a surviving row is a
        // broken download, a missing row with a surviving file is a leak.
        Storage::disk($file->disk)->delete($file->path);
        $file->delete();

        return response()->json(['message' => __('files.deleted')]);
    }

    private function format(CourseFile $f): array
    {
        return [
            'id' => $f->id,
            'course_id' => $f->course_id,
            'original_name' => $f->original_name,
            'category' => $f->category,
            'mime_type' => $f->mime_type,
            'size' => $f->size,
            'download_url' => $f->downloadUrl(),
            'uploaded_at' => $f->created_at,
        ];
    }
}
