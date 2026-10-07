<?php

namespace App\Listeners;

use App\Events\BookingCreated;
use App\Models\User;
use App\Notifications\BookingCreated as BookingCreatedNotification;
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

        // Every admin, in one query and one Notification::send call.
        Notification::send(
            User::where('role', 'admin')->get(),
            new BookingCreatedNotification($booking)
        );

        // The student is a Student row, not a User - notifiable only because of
        // the Notifiable trait on that model. No email on the row means the mail
        // channel has nowhere to go, so skip them entirely.
        if ($booking->student?->email) {
            $booking->student->notify(new BookingCreatedNotification($booking));
        }
    }
}
