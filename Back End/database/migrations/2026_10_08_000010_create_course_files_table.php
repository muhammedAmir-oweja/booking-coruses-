<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            // Who uploaded it: nullOnDelete, because losing the uploader must not
            // delete the syllabus. Matches how instructor_id is constrained.
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('original_name');
            // Both the path AND the disk: a row that only remembers a path breaks
            // the day one category of file moves to S3.
            $table->string('path');
            $table->string('disk')->default('course_files');
            $table->enum('category', ['syllabus', 'material', 'recording', 'other'])
                ->default('material');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->timestamps();

            // The index the listing actually uses: files of one course, by category.
            $table->index(['course_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_files');
    }
};
