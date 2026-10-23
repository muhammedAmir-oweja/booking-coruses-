<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a fourth course status: 'completed'.
 *
 * The scheduled CloseFinishedCourses command needs somewhere to put a course
 * whose end_date has passed, and none of the three existing values says it.
 * 'inactive' is an administrator's decision to stop selling; 'completed' is a
 * fact about the calendar. Collapsing the two would lose the difference between
 * "we pulled this course" and "this course has run its course".
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            $this->replacePostgresCheck(['draft', 'active', 'inactive', 'completed']);

            return;
        }

        Schema::table('courses', function (Blueprint $table) {
            $table->enum('status', ['draft', 'active', 'inactive', 'completed'])
                ->default('draft')
                ->change();
        });
    }

    public function down(): void
    {
        // Anything already marked completed has to land somewhere the old enum
        // accepts, or the column change fails on existing rows.
        DB::table('courses')->where('status', 'completed')->update(['status' => 'inactive']);

        if (DB::getDriverName() === 'pgsql') {
            $this->replacePostgresCheck(['draft', 'active', 'inactive']);

            return;
        }

        Schema::table('courses', function (Blueprint $table) {
            $table->enum('status', ['draft', 'active', 'inactive'])
                ->default('draft')
                ->change();
        });
    }

    /**
     * On Postgres an enum is a varchar plus a CHECK constraint, and Laravel's
     * ->change() emits "alter column ... type varchar(255) check (...)", which
     * Postgres rejects. Swap the constraint instead - the inline check from
     * create_courses_table gets Postgres's default name, courses_status_check.
     *
     * @param  list<string>  $allowed
     */
    private function replacePostgresCheck(array $allowed): void
    {
        $values = implode(', ', array_map(fn (string $v) => "'{$v}'", $allowed));

        DB::statement('alter table courses drop constraint if exists courses_status_check');
        DB::statement("alter table courses add constraint courses_status_check check (status in ({$values}))");
    }
};
