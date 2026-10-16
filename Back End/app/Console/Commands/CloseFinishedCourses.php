<?php

namespace App\Console\Commands;

use App\Models\Course;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Marks courses whose end date has passed as 'completed'.
 *
 * Scheduled daily in routes/console.php. Without it the catalogue slowly fills
 * with courses that are still 'active' months after they ended - they keep
 * appearing as bookable, and course_is_available() has to re-derive "has this
 * finished?" from end_date on every single read instead of the status saying so.
 */
class CloseFinishedCourses extends Command
{
    /**
     * --dry-run so the schedule can be inspected on production without
     * changing a row; --on lets a test pin "today" instead of waiting a day.
     */
    protected $signature = 'courses:close-finished
                            {--dry-run : List what would change without saving}
                            {--on= : Treat this Y-m-d date as today}';

    protected $description = 'Mark active courses whose end date has passed as completed';

    public function handle(): int
    {
        $today = $this->option('on') ? \Illuminate\Support\Carbon::parse($this->option('on')) : today();
        $dryRun = (bool) $this->option('dry-run');

        // Only 'active' courses are touched. A draft that was never published
        // and an 'inactive' course an admin deliberately withdrew are both
        // outside this command's business - it closes what was running, it does
        // not tidy the whole table.
        $courses = Course::query()
            ->where('status', 'active')
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<', $today)
            ->get();

        if ($courses->isEmpty()) {
            $this->info('No finished courses to close.');

            return self::SUCCESS;
        }

        foreach ($courses as $course) {
            $this->line(sprintf(
                '%s #%d  %s  (ended %s)',
                $dryRun ? 'would close' : 'closing',
                $course->id,
                $course->title,
                $course->end_date->toDateString(),
            ));

            if (! $dryRun) {
                $course->status = 'completed';
                // saveQuietly: closing a course is bookkeeping, not an edit
                // anybody made, so it must not wake model events meant for
                // user-driven changes.
                $course->saveQuietly();
            }
        }

        if (! $dryRun) {
            Log::channel('single')->info('courses.closed_finished', [
                'count' => $courses->count(),
                'ids' => $courses->pluck('id')->all(),
            ]);
        }

        $this->info(sprintf('%s %d course(s).', $dryRun ? 'Would close' : 'Closed', $courses->count()));

        return self::SUCCESS;
    }
}
