<?php

namespace App\Listeners;

use App\Events\BookingStatusChanged;
use Illuminate\Support\Facades\Log;

class RecordBookingStatusChange
{
    public function handle(BookingStatusChanged $event): void
    {
        $booking = $event->booking;

        // Was unpaid, is paid, never stamped: stamp it. This lived in
        // BookingController::updateStatus() as an `if` over the request payload;
        // here it happens however the status changes - controller, tinker, or a
        // future webhook. saveQuietly() so it does not re-enter the update path
        // that dispatched this event.
        if ($booking->payment_status === 'paid' && ! $booking->paid_at) {
            $booking->paid_at = now();
            $booking->saveQuietly();
        }

        Log::channel('single')->info('booking.status_changed', [
            'booking_id' => $booking->id,
            'status' => [$event->previousStatus, $booking->status],
            'payment' => [$event->previousPaymentStatus, $booking->payment_status],
            'actor_id' => auth()->id(),
        ]);
    }
}
