<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentDocumentController;
use App\Http\Controllers\Api\TrainingSessionController;
use App\Http\Controllers\Api\EnrollmentController;
use App\Http\Controllers\Api\BookingController;
use App\Models\User;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {

    Route::prefix('auth')->group(function () {
        Route::post('/logout',          [AuthController::class, 'logout']);
        Route::get('/me',               [AuthController::class, 'me']);
        Route::get('/me/student',       [AuthController::class, 'myStudent']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    Route::get('/users', function () {
        $role = request('role');
        $query = User::select('id', 'name', 'email', 'role')->orderBy('name');
        if ($role) {
            $query->where('role', $role);
        }
        return response()->json($query->get());
    });

    Route::get('/courses',                    [CourseController::class,          'index']);
    Route::get('/courses/{course}',           [CourseController::class,          'show']);
    Route::get('/students',                                        [StudentController::class,         'index']);
    Route::get('/students/{student}',                             [StudentController::class,         'show']);
    Route::get('/students/{student}/documents',                   [StudentDocumentController::class, 'index']);
    Route::get('/training-sessions',          [TrainingSessionController::class, 'index']);
    Route::get('/training-sessions/{trainingSession}', [TrainingSessionController::class, 'show']);
    Route::get('/enrollments',                [EnrollmentController::class,      'index']);
    Route::get('/enrollments/{enrollment}',   [EnrollmentController::class,      'show']);
    Route::get('/bookings',                   [BookingController::class,         'index']);
    Route::get('/bookings/{booking}',         [BookingController::class,         'show']);

    Route::middleware('admin')->group(function () {

        Route::post('/courses',                  [CourseController::class, 'store']);
        Route::put('/courses/{course}',          [CourseController::class, 'update']);
        Route::patch('/courses/{course}',        [CourseController::class, 'update']);
        Route::delete('/courses/{course}',       [CourseController::class, 'destroy']);

        Route::post('/students',                                        [StudentController::class,         'store']);
        Route::put('/students/{student}',                               [StudentController::class,         'update']);
        Route::patch('/students/{student}',                             [StudentController::class,         'update']);
        Route::post('/students/{student}',                              [StudentController::class,         'update']);
        Route::delete('/students/{student}',                            [StudentController::class,         'destroy']);

        Route::post('/students/{student}/documents',                    [StudentDocumentController::class, 'store']);
        Route::delete('/students/{student}/documents/{document}',       [StudentDocumentController::class, 'destroy']);

        Route::post('/training-sessions',                        [TrainingSessionController::class, 'store']);
        Route::put('/training-sessions/{trainingSession}',       [TrainingSessionController::class, 'update']);
        Route::patch('/training-sessions/{trainingSession}',     [TrainingSessionController::class, 'update']);
        Route::delete('/training-sessions/{trainingSession}',    [TrainingSessionController::class, 'destroy']);

        Route::post('/enrollments',              [EnrollmentController::class, 'store']);
        Route::put('/enrollments/{enrollment}',  [EnrollmentController::class, 'update']);
        Route::patch('/enrollments/{enrollment}',[EnrollmentController::class, 'update']);
        Route::delete('/enrollments/{enrollment}',[EnrollmentController::class, 'destroy']);

        Route::post('/bookings',                          [BookingController::class, 'store']);
        Route::patch('/bookings/{booking}/status',        [BookingController::class, 'updateStatus']);
        Route::delete('/bookings/{booking}',              [BookingController::class, 'destroy']);
    });

});
