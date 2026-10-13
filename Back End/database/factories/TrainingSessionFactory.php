<?php

namespace Database\Factories;

use App\Models\Course;
use Illuminate\Database\Eloquent\Factories\Factory;

class TrainingSessionFactory extends Factory
{
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('+1 day', '+30 days');
        $end   = (clone $start)->modify('+3 hours');

        return [
            'course_id'     => Course::factory(),
            'title'         => fake()->sentence(5),
            'description'   => fake()->sentence(10),
            'starts_at'     => $start,
            'ends_at'       => $end,
            'location'      => fake()->city(),
            'max_attendees' => fake()->numberBetween(10, 40),
            'status'        => 'scheduled',
        ];
    }
}
