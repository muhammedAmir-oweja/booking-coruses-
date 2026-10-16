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

        Schema::table('courses', function (Blueprint $table) {
            $table->enum('status', ['draft', 'active', 'inactive'])
                ->default('draft')
                ->change();
        });
    }
};
