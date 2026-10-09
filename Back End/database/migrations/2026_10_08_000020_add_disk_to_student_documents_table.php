<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Student documents used to live in one flat, world-readable folder on the
     * public disk. New uploads go to a private per-student folder instead, so
     * the row has to record which disk it is on.
     *
     * The default is 'public' on purpose: every existing row stays resolvable
     * exactly where it already is.
     */
    public function up(): void
    {
        Schema::table('student_documents', function (Blueprint $table) {
            $table->string('disk')->default('public')->after('path');
        });
    }

    public function down(): void
    {
        Schema::table('student_documents', function (Blueprint $table) {
            $table->dropColumn('disk');
        });
    }
};
