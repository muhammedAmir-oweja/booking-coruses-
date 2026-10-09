<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id', 'uploaded_by', 'original_name',
        'path', 'disk', 'category', 'mime_type', 'size',
    ];

    protected function casts(): array
    {
        return ['size' => 'integer'];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Deliberately NOT a getUrlAttribute() like StudentDocument had: these files
     * are private, so the only way out is the authorized download route.
     */
    public function downloadUrl(): string
    {
        return url("/api/courses/{$this->course_id}/files/{$this->id}");
    }
}
