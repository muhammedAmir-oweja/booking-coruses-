<?php

namespace App\Console\Commands;

use App\Models\Course;
use App\Notifications\CourseStartingSoon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Reminds enrolled students that their course starts soon.
 *
 * Scheduled daily. It deliberately matches an EXACT date - start_date is
 * today + N - rather than a range: a "starts within 3 days" window would
 * re-send the same reminder on each of the three days the window covers.
 */
class SendCourseStartReminders extends Command
{
    protected $signature = 'courses:remind-starting
                            {--days=3 : How many days before the start date to remind}
                            {--dry-run : Report recipients without notifying anyone}';

    protected $description = 'Notify students enrolled in a course that starts in N days';

    public function handle(): int
    {
        $days = max(0, (int) $this->option('days'));
        $dryRun = (bool) $this->option('dry-run');
        $target = today()->addDays($days);

        $courses = Course::query()
            ->where('status', 'active')
            ->whereDate('start_date', $target)
            // Cancelled enrolments are excluded here rather than filtered after
            // loading, so a course where everyone cancelled is skipped outright.
            ->whereHas('enrollments', fn ($q) => $q->where('status', '!=', 'cancelled'))
            ->with(['enrollments' => fn ($q) => $q->where('status', '!=', 'cancelled')->with('student')])
            ->get();

        if ($courses->isEmpty()) {
            $this->info("No courses start on {$target->toDateString()}.");

            return self::SUCCESS;
        }

        $sent = 0;

        foreach ($courses as $course) {
            foreach ($course->enrollments as $enrollment) {
                $student = $enrollment->student;
                if (! $student) {
                    continue;
                }

                $this->line(sprintf(
                    '%s %s -> %s',
                    $dryRun ? 'would notify' : 'notifying',
                    $student->name,
                    $course->title,
                ));

                if (! $dryRun) {
                    $student->notify(new CourseStartingSoon($course, $days));
                }

                $sent++;
            }
        }

        if (! $dryRun) {
            Log::channel('single')->info('courses.start_reminders_sent', [
                'date' => $target->toDateString(),
                'courses' => $courses->pluck('id')->all(),
                'recipients' => $sent,
            ]);
        }

        $this->info(sprintf('%s %d student(s).', $dryRun ? 'Would notify' : 'Notified', $sent));

        return self::SUCCESS;
    }
}
