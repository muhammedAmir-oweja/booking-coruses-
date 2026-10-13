<?php

namespace App\Http\Requests;

use App\Models\Course;
use Illuminate\Foundation\Http\FormRequest;

class StoreTrainingSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        // Admins can create sessions on any course.
        if ($user->isAdmin()) {
            return true;
        }

        // Instructors may only add sessions to courses they own.
        $courseId = (int) $this->input('course_id');
        if ($courseId && $user->isInstructor()) {
            return Course::where('id', $courseId)
                ->where('instructor_id', $user->id)
                ->exists();
        }

        return false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'course_id' => ['required', 'exists:courses,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'location' => ['nullable', 'string', 'max:255'],
            'max_attendees' => ['nullable', 'integer', 'min:1'],
            'status' => ['required', 'in:scheduled,ongoing,completed,cancelled'],
        ];
    }
}
