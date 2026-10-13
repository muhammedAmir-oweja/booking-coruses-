<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'student_id'     => Student::factory(),
            'course_id'      => Course::factory(),
            'user_id'        => User::factory(),
            'amount'         => fake()->randomFloat(2, 50, 500),
            'status'         => 'pending',
            'payment_status' => 'unpaid',
            'payment_method' => null,
            'transaction_id' => null,
            'booked_at'      => now(),
            'paid_at'        => null,
        ];
    }
}
