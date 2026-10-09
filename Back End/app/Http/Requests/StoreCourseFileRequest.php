<?php

namespace App\Http\Requests;

use App\Models\CourseFile;
use Illuminate\Foundation\Http\FormRequest;

class StoreCourseFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', CourseFile::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // 25 MB, and an allow-list - never a deny-list. mimes: checks the
            // real type, not the extension the uploader typed.
            //
            // NOTE: this ceiling is only honest if PHP allows the request
            // through first. See the comment in CourseFileController::store().
            'file' => ['required', 'file', 'max:25600',
                      'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,zip,mp4,mp3,png,jpg,jpeg'],
            'category' => ['sometimes', 'in:syllabus,material,recording,other'],
        ];
    }
}
