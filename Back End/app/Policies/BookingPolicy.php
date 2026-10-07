<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;

class BookingPolicy
{
    /**
     * Admin short-circuits everything. Note what this implies: an admin passes
     * create() even though the body only allows students, and the only_self
     * check in StoreBookingRequest is skipped for them too - which is what lets
     * an admin book on a student's behalf. That is deliberate.
     */
    public function before(User $user, string $ability): ?bool
    {
        return $user->isAdmin() ? true : null;
    }

    public function viewAny(User $user): bool
    {
        // True for students, but index() still scopes the query - a policy
        // does not filter a collection.
        return $user->isStudent();
    }

    public function view(User $user, Booking $booking): bool
    {
        // User hasOne Student (see User::student()), and bookings carry both a
        // student_id and the user_id of whoever created the row.
        return $booking->student_id === $user->student?->id
            || $booking->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        // A student may book, but only for themselves - enforced in the form
        // request, which compares student_id to $user->student->id.
        return $user->isStudent() && $user->student !== null;
    }

    public function updateStatus(User $user, Booking $booking): bool
    {
        return false;   // admin only, via before()
    }

    public function delete(User $user, Booking $booking): bool
    {
        return false;   // admin only, via before()
    }
}
