<?php

use App\Models\Course;



if (! function_exists('course_taken_seats')) {
    /**
     * Seats already taken: every booking that has not been cancelled.
     */
    function course_taken_seats(Course $course): int
    {
        // Use a count the query already loaded (see withCount in step 3) so
        // that listing 20 courses does not fire 20 extra queries.
        if (isset($course->active_bookings_count)) {
            return (int) $course->active_bookings_count;
        }

        return $course->bookings()
            ->whereIn('status', ['pending', 'confirmed'])
            ->count();
    }
}

if (! function_exists('course_remaining_seats')) {
    /**
     * Total capacity minus the seats taken. Never negative.
     */
    function course_remaining_seats(Course $course): int
    {
        return max(0, (int) $course->capacity - course_taken_seats($course));
    }
}

if (! function_exists('course_is_available')) {
    /**
     * Can a student be booked onto this course right now?
     * Active status, the course has not finished, and at least one free seat.
     */
    function course_is_available(Course $course): bool
    {
        if ($course->status !== 'active') {
            return false;
        }

        // end_date is cast to a date, so compare against today's date - not
        // now() - or a course ending today would read as already finished.
        if ($course->end_date && $course->end_date->lt(today())) {
            return false;
        }

        return course_remaining_seats($course) > 0;
    }
}