<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class StudentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'       => null,
            'name'          => fake()->name(),
            'email'         => fake()->unique()->safeEmail(),
            'phone'         => fake()->phoneNumber(),
            'date_of_birth' => fake()->date('Y-m-d', '-18 years'),
        ];
    }
}
