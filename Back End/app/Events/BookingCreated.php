<?php

namespace App\Events;

use App\Models\Booking;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BookingCreated
{
    use Dispatchable, SerializesModels;

    /**
     * A value object: no logic, no notifications, no mail. What happened is
     * described once here; the reactions are listed in app/Listeners.
     *
     * SerializesModels stores only the booking's id when this event is queued
     * and re-fetches it in the worker - so load relations in the listener, not
     * here.
     */
    public function __construct(public readonly Booking $booking) {}
}
