<?php

namespace App\Listeners;

use App\Events\BookingCreated;
use App\Mail\BookingConfirmed;
use Illuminate\Support\Facades\Mail;

class SendBookingConfirmationMail
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

        // send(), not queue(): against the log driver this is instant. Switch to
        // queue() - and run a worker - the moment MAIL_MAILER stops being log.
        Mail::to($booking->student->email)
            ->send(new BookingConfirmed($booking));
    }
}
