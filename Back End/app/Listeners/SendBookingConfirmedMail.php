<?php

namespace App\Listeners;

use App\Events\BookingStatusChanged;
use App\Mail\BookingConfirmed;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * The real confirmation mail: it goes out when a booking BECOMES confirmed,
 * not when it is created.
 *
 * A third listener rather than another branch inside
 * RecordBookingStatusChange: that one writes the audit line and must keep
 * running even if the mail host is down.
 */
class SendBookingConfirmedMail
{
    public function handle(BookingStatusChanged $event): void
    {
        $booking = $event->booking;

        // Only the transition INTO confirmed. Without the previous-status
        // check, every later edit of a confirmed booking - marking it paid,
        // say - would send the confirmation again.
        if ($booking->status !== 'confirmed' || $event->previousStatus === 'confirmed') {
            return;
        }

        $booking->loadMissing(['student', 'course']);

        // students.email is nullable in the migration, so this guard is real.
        if (! $booking->student?->email) {
            return;
        }

        // See SendBookingReceivedMail: the mail host must not be able to fail
        // the PATCH that confirmed the booking.
        try {
            Mail::to($booking->student->email)->send(new BookingConfirmed($booking));
        } catch (\Throwable $e) {
            Log::channel('single')->warning('booking.confirmed_mail_failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
