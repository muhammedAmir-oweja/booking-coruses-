<?php

namespace App\Policies;

use App\Models\Student;
use App\Models\User;

class StudentPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        return $user->isAdmin() ? true : null;
    }

    /**
     * The roster is an admin list; the routes already sit in the admin-only
     * group, so these only matter if a student record is ever exposed
     * elsewhere - a student reading their own row.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    public function view(User $user, Student $student): bool
    {
        return $student->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, Student $student): bool
    {
        return false;
    }

    public function delete(User $user, Student $student): bool
    {
        return false;
    }
}
