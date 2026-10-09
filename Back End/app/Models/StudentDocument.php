<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'original_name',
        'path',
        'disk',
        'mime_type',
        'size',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Replaces the old getUrlAttribute(), which returned asset('storage/'.$path)
     * and therefore only ever worked for the world-readable public disk. These
     * now live on a private disk, so the only way out is the authorized
     * download route - same shape as CourseFile::downloadUrl().
     *
     * Rows written before this change carry disk='public' and keep streaming
     * correctly, because download() reads the disk off the row.
     */
    public function downloadUrl(): string
    {
        return url("/api/students/{$this->student_id}/documents/{$this->id}");
    }
}
