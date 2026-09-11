<?php

use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EnrollmentController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentDocumentController;
use App\Http\Controllers\Api\TrainingSessionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Middleware\DevAuthBypass;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Dev only: DEV_NO_AUTH=true swaps the real auth stack for a middleware that
// signs each request in as an admin, so the admin app runs without a login.
$adminOnly = config('app.dev_no_auth')
    ? [DevAuthBypass::class]
    : ['auth:sanctum', 'admin'];

Route::middleware($adminOnly)->group(function () {

    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    Route::apiResource('users', UserController::class);

    Route::apiResource('courses', CourseController::class);
    Route::apiResource('students', StudentController::class);
    Route::apiResource('training-sessions', TrainingSessionController::class);
    Route::apiResource('enrollments', EnrollmentController::class);
    Route::apiResource('bookings', BookingController::class)->except(['update']);
    Route::patch('/bookings/{booking}/status', [BookingController::class, 'updateStatus']);

    Route::get('/students/{student}/documents', [StudentDocumentController::class, 'index']);
    Route::post('/students/{student}/documents', [StudentDocumentController::class, 'store']);
    Route::delete('/students/{student}/documents/{document}', [StudentDocumentController::class, 'destroy']);
});
