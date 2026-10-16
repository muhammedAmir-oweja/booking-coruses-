<?php

namespace App\Listeners;

use App\Events\BookingCreated;
use App\Mail\BookingReceived;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendBookingReceivedMail
{
    /**
     * A second listener on the same event, deliberately separate from
     * SendBookingCreatedNotifications: a broken mail host must not stop the
     * bell from working.
     */
    public function handle(BookingCreated $event): void
    {
        $booking = $event->booking->loadMissing(['student', 'course']);

        // students.email is nullable in the migration, so this guard is real.
        if (! $booking->student?->email) {
            return;
        }

        // Wrapped, because the mail host is the one part of this that is not
        // ours. A booking is already saved by the time this runs: letting a
        // transport error escape would turn a successful POST /api/bookings
        // into a 500, and the student would be told their booking failed when
        // it did not. Mailtrap's free tier rejecting a second message in the
        // same second is exactly how that happens.
        try {
            Mail::to($booking->student->email)->send(new BookingReceived($booking));
        } catch (\Throwable $e) {
            Log::channel('single')->warning('booking.received_mail_failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
