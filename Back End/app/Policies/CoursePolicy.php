<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\User;

class CoursePolicy
{
    /**
     * Runs before every other method: admin short-circuits the whole policy.
     * Return null, never false, or you also deny the methods below.
     */
    public function before(User $user, string $ability): ?bool
    {
        return $user->isAdmin() ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return true;   // the catalogue is readable by anyone signed in
    }

    public function view(User $user, Course $course): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isInstructor();
    }

    public function update(User $user, Course $course): bool
    {
        // instructor_id is a FK to users.id - see the courses migration.
        return $user->isInstructor() && $course->instructor_id === $user->id;
    }

    public function delete(User $user, Course $course): bool
    {
        return $this->update($user, $course);
    }
}
