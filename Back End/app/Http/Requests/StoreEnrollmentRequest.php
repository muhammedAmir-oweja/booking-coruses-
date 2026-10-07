<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEnrollmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;   // the route group is already gated to admin + instructor
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'student_id' => ['required', 'exists:students,id'],
            'course_id' => [
                'required',
                'exists:courses,id',
                // $request->student_id in the controller becomes $this->student_id
                // here. Miss it and duplicate enrollments come back.
                Rule::unique('enrollments')->where(fn ($q) => $q->where('student_id', $this->student_id)),
            ],
            'enrolled_at' => ['nullable', 'date'],
            'status' => ['sometimes', 'in:pending,confirmed,cancelled'],
        ];
    }
}
