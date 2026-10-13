<?php

namespace App\Http\Requests;

use App\Models\Booking;
use App\Models\Course;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Booking::class);
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
                // A student may not have two active bookings for the same course.
                // Soft-deleted bookings are excluded from the unique check, so a
                // cancelled-and-deleted booking does not block a re-booking.
                Rule::unique('bookings')->where(
                    fn ($q) => $q->where('student_id', $this->student_id)
                              ->whereNull('deleted_at')
                ),
            ],
            'amount' => ['required', 'numeric', 'min:0'],
            'status' => ['sometimes', 'in:pending,confirmed,cancelled'],
            'payment_status' => ['sometimes', 'in:unpaid,paid,refunded'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'transaction_id' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * Two rules that need the authenticated user, so they cannot live in
     * rules(): a student may only book themselves, and a full course refuses
     * the booking. The second one moved here from BookingController::store(),
     * where task 21 parked it - it is not in both places.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $user = $this->user();

                if ($user->isStudent() && (int) $this->student_id !== $user->student?->id) {
                    $validator->errors()->add('student_id', __('bookings.only_self'));
                }

                // course_is_available() is the task 21 helper - already autoloaded.
                $course = Course::find($this->course_id);

                if ($course && ! course_is_available($course)) {
                    $validator->errors()->add('course_id', __('bookings.course_full'));
                }
            },
        ];
    }
}
