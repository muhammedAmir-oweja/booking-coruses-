<?php

namespace App\Policies;

use App\Models\CourseFile;
use App\Models\User;

class CourseFilePolicy
{
    public function before(User $user, string $ability): ?bool
    {
        return $user->isAdmin() ? true : null;
    }

    /**
     * Gates the *kind* of actor only. Whether this instructor owns the course
     * being uploaded to is a question about the Course, so it is answered by
     * CoursePolicy::update() inside CourseFileController::store() - the request's
     * authorize() cannot see the route's course binding reliably enough to do it
     * here.
     */
    public function create(User $user): bool
    {
        return $user->isInstructor();
    }

    public function view(User $user, CourseFile $file): bool
    {
        return true;   // the course gate in the controller is the real check
    }

    public function delete(User $user, CourseFile $file): bool
    {
        return $user->isInstructor() && $file->course?->instructor_id === $user->id;
    }
}
