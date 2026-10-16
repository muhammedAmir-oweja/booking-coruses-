<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('course'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $course = $this->route('course');

        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'instructor_id' => ['sometimes', 'exists:users,id'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'capacity' => ['sometimes', 'integer', 'min:1'],
            'hours' => ['nullable', 'integer', 'min:0'],
            'status' => ['sometimes', 'in:draft,active,inactive,completed'],
            'start_date' => ['sometimes', 'date'],
            // `after:start_date` reads the request body, so on a partial update
            // that omits start_date it has nothing to compare and silently
            // passes. Fall back to the stored value.
            'end_date' => ['nullable', 'date', function ($attribute, $value, $fail) use ($course) {
                $start = $this->input('start_date', $course->start_date?->toDateString());

                if ($start && $value && strtotime($value) <= strtotime($start)) {
                    $fail('The end date must be after the start date.');
                }
            }],
        ];
    }
}
