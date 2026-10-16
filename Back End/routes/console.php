<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled work
|--------------------------------------------------------------------------
|
| Laravel 13 registers the schedule here rather than in a Console Kernel.
|
| One cron entry drives all of it - add this to the server's crontab and
| nothing else:
|
|   * * * * * cd /path/to/Back End && php artisan schedule:run >> /dev/null 2>&1
|
| Check what is registered with `php artisan schedule:list`, and run a single
| job by hand with `php artisan courses:close-finished --dry-run`.
|
*/

// Just after midnight: a course that ended yesterday should read as finished
// the first time anyone looks today.
Schedule::command('courses:close-finished')
    ->dailyAt('00:10')
    ->timezone(config('app.timezone'))
    // The run takes seconds, but a stuck database connection must not let two
    // copies pile up on top of each other.
    ->withoutOverlapping()
    // Skipped rather than queued if the server was off at 00:10 - closing
    // yesterday's courses at 03:00 is right, doing it twice is not.
    ->onOneServer()
    ->appendOutputTo(storage_path('logs/schedule.log'));

// Mid-morning, so the reminder lands in a working day rather than at 00:10.
Schedule::command('courses:remind-starting --days=3')
    ->dailyAt('09:00')
    ->timezone(config('app.timezone'))
    ->withoutOverlapping()
    ->onOneServer()
    ->appendOutputTo(storage_path('logs/schedule.log'));
