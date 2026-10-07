<?php

namespace App\Http\Controllers\Api;

use App\Events\BookingCreated;
use App\Events\BookingStatusChanged;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBookingRequest;
use App\Http\Requests\UpdateBookingStatusRequest;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Booking::with(['student', 'course']);

        // A student sees only their own rows. Null-safe on purpose: a student
        // user with no students row sees an empty list, not everyone's.
        if ($request->user()->isStudent()) {
            $query->where('student_id', $request->user()->student?->id);
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
        $bookings->getCollection()->transform(fn ($b) => $this->format($b));

        return response()->json($bookings);
    }

    public function show(Booking $booking): JsonResponse
    {
        $this->authorize('view', $booking);

        $booking->load(['student', 'course']);

        return response()->json($this->format($booking));
    }

    public function store(StoreBookingRequest $request): JsonResponse
    {
        // Rules, the only-self check and the full-course guard all live in
        // StoreBookingRequest now. Task 21 parked that guard here; it is not
        // in both places.
        $data = $request->validated();

        $data['user_id'] = $request->user()->id;
        $data['booked_at'] = now();
        $data['status'] = $data['status'] ?? 'pending';
        $data['payment_status'] = $data['payment_status'] ?? 'unpaid';

        $booking = Booking::create($data);
        $booking->load(['student', 'course']);

        // The controller dispatches and nothing else: it never learns that a
        // booking notifies anyone or sends mail. That is why the mail task
        // touches no controller at all.
        BookingCreated::dispatch($booking);

        return response()->json($this->format($booking), 201);
    }

    public function updateStatus(UpdateBookingStatusRequest $request, Booking $booking): JsonResponse
    {
        $data = $request->validated();

        // paid_at is stamped by RecordBookingStatusChange now, not here.
        $previousStatus = $booking->status;
        $previousPaymentStatus = $booking->payment_status;

        $booking->update($data);
        $booking->load(['student', 'course']);

        // Only fire when something actually moved, or every no-op PATCH
        // generates an audit row. wasChanged(), not isDirty(): after update()
        // the model is saved, so isDirty() is already false.
        if ($booking->wasChanged(['status', 'payment_status'])) {
            BookingStatusChanged::dispatch($booking, $previousStatus, $previousPaymentStatus);
        }

        return response()->json($this->format($booking));
    }

    public function destroy(Booking $booking): JsonResponse
    {
        $booking->delete();

        return response()->json(['message' => __('messages.booking_cancelled')]);
    }

    private function format(Booking $b): array
    {
        return [
            'id' => $b->id,
            'student_id' => $b->student_id,
            'course_id' => $b->course_id,
            'user_id' => $b->user_id,
            'student' => $b->student ? [
                'id' => $b->student->id,
                'name' => $b->student->name,
                'email' => $b->student->email,
            ] : null,
            'course' => $b->course ? [
                'id' => $b->course->id,
                'title' => $b->course->title,
                'price' => $b->course->price,
            ] : null,
            'amount' => (float) $b->amount,
            'status' => $b->status,
            'payment_status' => $b->payment_status,
            'payment_method' => $b->payment_method,
            'transaction_id' => $b->transaction_id,
            'booked_at' => $b->booked_at?->toDateTimeString(),
            'paid_at' => $b->paid_at?->toDateTimeString(),
            'created_at' => $b->created_at,
        ];
    }
}
