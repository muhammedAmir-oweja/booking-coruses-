<?php

use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\CourseFileController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EnrollmentController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PreferenceController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentDocumentController;
use App\Http\Controllers\Api\TrainingSessionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Middleware\DevAuthBypass;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Role groups
|--------------------------------------------------------------------------
|
| The matrix is not a judgement call: Front End/src/components/layout/
| Navbar.tsx's ROUTES array already states which role reaches which page.
| This file is that table expressed in routes, so a page the sidebar shows
| never 403s.
|
| The named limiters behind throttle:login / throttle:bookings /
| throttle:uploads are defined in AppServiceProvider::boot().
|
|
*/

// ---------------------------------------------------------------- public
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:login');
});

// Authenticated, but by the REFRESH token rather than the access token - so it
// keeps working in the window where the access token has already expired,
// which is the only moment it is ever called.
Route::post('/auth/refresh', [AuthController::class, 'refresh'])
    ->middleware(['auth:sanctum', 'abilities:refresh', 'throttle:login']);

// Dev only: DEV_NO_AUTH=true signs every request in as an admin, which defeats
// every role group below. Set it to false before testing authorization.
// 'abilities:access' is what stops a refresh token being used as an access
// token: it carries only the 'refresh' ability, so it is rejected by every
// group below and is accepted on exactly one route - POST /auth/refresh.
$authed = config('app.dev_no_auth')
    ? [DevAuthBypass::class]
    : ['auth:sanctum', 'abilities:access'];

// -------------------------------------------------------------- any role
Route::middleware($authed)->group(function () {

    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });

    // The bell belongs to every signed-in user (task 22).
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // Reading the catalogue is open to everyone signed in; the write half is in
    // the next group. Both index() methods scope themselves - see step 4.
    Route::get('/courses', [CourseController::class, 'index']);
    Route::get('/courses/{course}', [CourseController::class, 'show']);
    Route::get('/enrollments', [EnrollmentController::class, 'index']);

    // Display preferences (task 26). Any signed-in user, their own settings.
    Route::get('/preferences', [PreferenceController::class, 'show']);
    Route::put('/preferences', [PreferenceController::class, 'update']);
});

// ----------------------------------------------------- admin + instructor
Route::middleware([...$authed, 'role:admin,instructor'])->group(function () {
    Route::post('/courses', [CourseController::class, 'store']);
    Route::put('/courses/{course}', [CourseController::class, 'update']);
    Route::delete('/courses/{course}', [CourseController::class, 'destroy']);

    Route::apiResource('training-sessions', TrainingSessionController::class);
    Route::apiResource('enrollments', EnrollmentController::class)->except(['index']);

    // Course files (task 25). Every one of the four authorizes against
    // CoursePolicy inside the controller, because the role group cannot tell
    // whose course this is.
    Route::get('/courses/{course}/files', [CourseFileController::class, 'index']);
    Route::post('/courses/{course}/files', [CourseFileController::class, 'store'])
        ->middleware('throttle:uploads');
    Route::get('/courses/{course}/files/{file}', [CourseFileController::class, 'download']);
    Route::delete('/courses/{course}/files/{file}', [CourseFileController::class, 'destroy']);
});

// -------------------------------------------------------- admin + student
Route::middleware([...$authed, 'role:admin,student'])->group(function () {
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/{booking}', [BookingController::class, 'show']);
    Route::post('/bookings', [BookingController::class, 'store'])
        ->middleware('throttle:bookings');
});

// ------------------------------------------------------------ admin only
Route::middleware([...$authed, 'role:admin'])->group(function () {
    // Admin only, and it has to be: stats() is entirely unscoped. It returns
    // business-wide totals, six months of revenue history, and the ten most
    // recent bookings WITH the student names and the amounts they paid. Only
    // AdminDashboard calls it, so sitting in the any-role group was invisible
    // in the UI - but any signed-in student could read the lot with one
    // request. Hiding a caller is not authorization.
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    Route::apiResource('users', UserController::class);
    Route::apiResource('students', StudentController::class);

    Route::patch('/bookings/{booking}/status', [BookingController::class, 'updateStatus']);
    Route::delete('/bookings/{booking}', [BookingController::class, 'destroy']);

    Route::get('/students/{student}/documents', [StudentDocumentController::class, 'index']);
    Route::post('/students/{student}/documents', [StudentDocumentController::class, 'store'])
        ->middleware('throttle:uploads');
    // Task 25 moved these onto a private disk, so a download needs a route of
    // its own - asset('storage/...') no longer resolves.
    Route::get('/students/{student}/documents/{document}', [StudentDocumentController::class, 'download']);
    Route::delete('/students/{student}/documents/{document}', [StudentDocumentController::class, 'destroy']);
});
