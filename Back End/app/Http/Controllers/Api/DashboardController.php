<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Course;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $totalCourses = Course::count();
        $totalStudents = Student::count();
        $totalBookings = Booking::count();
        $totalRevenue = Booking::where('payment_status', 'paid')->sum('amount');

        $recentBookings = Booking::with(['student', 'course'])
            ->latest('booked_at')
            ->limit(10)
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'student_id' => $b->student_id,
                'course_id' => $b->course_id,
                'user_id' => $b->user_id,
                'amount' => (float) $b->amount,
                'status' => $b->status,
                'payment_status' => $b->payment_status,
                'booked_at' => $b->booked_at,
                'student' => $b->student ? [
                    'id' => $b->student->id,
                    'name' => $b->student->name,
                ] : null,
                'course' => $b->course ? [
                    'id' => $b->course->id,
                    'title' => $b->course->title,
                ] : null,
            ]);

        $topCourses = Course::withCount('enrollments')
            ->with('instructor')
            ->orderByDesc('enrollments_count')
            ->limit(5)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'title' => $c->title,
                'price' => $c->price,
                'capacity' => $c->capacity,
                'status' => $c->status,
                'enrolled_count' => $c->enrollments_count,
                'instructor' => $c->instructor ? [
                    'id' => $c->instructor->id,
                    'name' => $c->instructor->name,
                ] : null,
            ]);

        $monthlyRevenue = Booking::where('payment_status', 'paid')
            ->where('booked_at', '>=', now()->subMonths(6)->startOfMonth())
            ->select(
                DB::raw("DATE_FORMAT(booked_at, '%Y-%m') as month"),
                DB::raw('SUM(amount) as revenue')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => [
                'month' => $r->month,
                'revenue' => (float) $r->revenue,
            ]);

        $monthlyBookings = Booking::where('booked_at', '>=', now()->subMonths(6)->startOfMonth())
            ->select(
                DB::raw("DATE_FORMAT(booked_at, '%Y-%m') as month"),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => [
                'month' => $r->month,
                'count' => (int) $r->count,
            ]);

        return response()->json([
            'total_courses' => $totalCourses,
            'total_bookings' => $totalBookings,
            'total_users' => $totalStudents,
            'total_revenue' => (float) $totalRevenue,
            'recent_bookings' => $recentBookings,
            'top_courses' => $topCourses,
            'monthly_revenue' => $monthlyRevenue,
            'monthly_bookings' => $monthlyBookings,
        ]);
    }
}
