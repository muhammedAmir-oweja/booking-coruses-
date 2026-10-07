<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTrainingSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;   // admin + instructor group
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $session = $this->route('training_session');

        return [
            'course_id' => ['sometimes', 'exists:courses,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['sometimes', 'date'],
            // See UpdateCourseRequest - `after:` compares against the request
            // body, which a partial update may not carry.
            'ends_at' => ['sometimes', 'date', function ($attribute, $value, $fail) use ($session) {
                $start = $this->input('starts_at', $session->starts_at?->toDateTimeString());

                if ($start && $value && strtotime($value) <= strtotime($start)) {
                    $fail('The end time must be after the start time.');
                }
            }],
            'location' => ['nullable', 'string', 'max:255'],
            'max_attendees' => ['nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'in:scheduled,ongoing,completed,cancelled'],
        ];
    }
}
