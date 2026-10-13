<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CourseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'instructor_id' => User::factory()->create(['role' => 'instructor'])->id,
            'title'         => fake()->sentence(4),
            'description'   => fake()->paragraph(),
            'price'         => fake()->randomFloat(2, 50, 500),
            'capacity'      => fake()->numberBetween(10, 50),
            'hours'         => fake()->numberBetween(10, 60),
            'status'        => 'active',
            'start_date'    => now()->addDay()->toDateString(),
            'end_date'      => now()->addMonths(2)->toDateString(),
        ];
    }
}
