<?php

namespace App\Events;

use App\Models\Booking;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BookingStatusChanged
{
    use Dispatchable, SerializesModels;

    /**
     * Carries the previous values alongside the booking: once update() has run
     * the model no longer knows what it used to be, and the audit line needs
     * both sides of the transition.
     */
    public function __construct(
        public readonly Booking $booking,
        public readonly ?string $previousStatus,
        public readonly ?string $previousPaymentStatus,
    ) {}
}
