<?php

namespace App\Listeners;

use App\Events\BookingCreated;
use App\Models\User;
use App\Notifications\BookingCreated as BookingCreatedNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class SendBookingCreatedNotifications
{
    /**
     * The event and the notification share a short name, hence the alias on the
     * import above. Laravel 13 discovers this listener from the parameter type,
     * so there is no provider to register it in.
     */
    public function handle(BookingCreated $event): void
    {
        $booking = $event->booking->loadMissing(['student', 'course']);

        // Every admin, in one query and one Notification::send call. Guarded
        // for the same reason as the mailables: admins receive this one by
        // mail as well as in the bell, so a mail outage would otherwise take
        // the booking request down with it - and the database half of the
        // notification would be lost too.
        try {
            Notification::send(
                User::where('role', 'admin')->get(),
                new BookingCreatedNotification($booking)
            );
        } catch (\Throwable $e) {
            Log::channel('single')->warning('booking.admin_notify_failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }

        // The student is a Student row, not a User - notifiable only because of
        // the Notifiable trait on that model. No email on the row means the mail
        // channel has nowhere to go, so skip them entirely.
        if ($booking->student?->email) {
            $booking->student->notify(new BookingCreatedNotification($booking));
        }
    }
}
