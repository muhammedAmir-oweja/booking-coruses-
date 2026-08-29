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
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {

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
    Route::apiResource('bookings', BookingController::class);

    Route::get('/students/{student}/documents', [StudentDocumentController::class, 'index']);
    Route::post('/students/{student}/documents', [StudentDocumentController::class, 'store']);
    Route::delete('/students/{student}/documents/{document}', [StudentDocumentController::class, 'destroy']);
});
