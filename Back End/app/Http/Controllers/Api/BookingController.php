<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    /**
     * GET /api/bookings
     */
    public function index(Request $request): JsonResponse
    {
        $query = Booking::with(['student', 'course']);

        // Students only see their own bookings
        if ($request->user()?->role === 'student') {
            $student = \App\Models\Student::where('user_id', $request->user()->id)->first();
            $query->where('student_id', $student?->id ?? 0);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        $perPage = min((int) $request->get('per_page', 10), 200);
        $bookings = $query->latest('booked_at')->paginate($perPage);
        $bookings->getCollection()->transform(fn($b) => $this->format($b));

        return response()->json($bookings);
    }

    /**
     * GET /api/bookings/{id}
     */
    public function show(Booking $booking): JsonResponse
    {
        $booking->load(['student', 'course']);
        return response()->json($this->format($booking));
    }

    /**
     * POST /api/bookings
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id'     => ['required', 'exists:students,id'],
            'course_id'      => ['required', 'exists:courses,id'],
            'amount'         => ['required', 'numeric', 'min:0'],
            'status'         => ['sometimes', 'in:pending,confirmed,cancelled'],
            'payment_status' => ['sometimes', 'in:unpaid,paid,refunded'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'transaction_id' => ['nullable', 'string', 'max:100'],
        ]);

        $data['user_id']    = $request->user()->id;
        $data['booked_at']  = now();
        $data['status']     = $data['status'] ?? 'pending';
        $data['payment_status'] = $data['payment_status'] ?? 'unpaid';

        $booking = Booking::create($data);
        $booking->load(['student', 'course']);

        return response()->json($this->format($booking), 201);
    }

    /**
     * PATCH /api/bookings/{id}/status
     */
    public function updateStatus(Request $request, Booking $booking): JsonResponse
    {
        $data = $request->validate([
            'status'         => ['sometimes', 'in:pending,confirmed,cancelled'],
            'payment_status' => ['sometimes', 'in:unpaid,paid,refunded'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'transaction_id' => ['nullable', 'string', 'max:100'],
        ]);

        if (isset($data['payment_status']) && $data['payment_status'] === 'paid' && ! $booking->paid_at) {
            $data['paid_at'] = now();
        }

        $booking->update($data);
        $booking->load(['student', 'course']);

        return response()->json($this->format($booking));
    }

    /**
     * DELETE /api/bookings/{id}
     */
    public function destroy(Booking $booking): JsonResponse
    {
        $booking->delete();
        return response()->json(['message' => 'Booking cancelled successfully.']);
    }

    private function format(Booking $b): array
    {
        return [
            'id'             => $b->id,
            'student_id'     => $b->student_id,
            'course_id'      => $b->course_id,
            'user_id'        => $b->user_id,
            'student'        => $b->student ? [
                'id'    => $b->student->id,
                'name'  => $b->student->name,
                'email' => $b->student->email,
            ] : null,
            'course'         => $b->course ? [
                'id'    => $b->course->id,
                'title' => $b->course->title,
                'price' => $b->course->price,
            ] : null,
            'amount'         => (float) $b->amount,
            'status'         => $b->status,
            'payment_status' => $b->payment_status,
            'payment_method' => $b->payment_method,
            'transaction_id' => $b->transaction_id,
            'booked_at'      => $b->booked_at?->toDateTimeString(),
            'paid_at'        => $b->paid_at?->toDateTimeString(),
            'created_at'     => $b->created_at,
        ];
    }
}
