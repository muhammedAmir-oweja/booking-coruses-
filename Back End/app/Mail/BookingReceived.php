<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent the moment a booking is created, while it is still pending.
 * The confirmation that follows an admin approving it is BookingConfirmed.
 */
class BookingReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Booking $booking) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('bookings.mail_subject', ['course' => $this->booking->course?->title]),
        );
    }

    public function content(): Content
    {
        // Everything the template needs, passed explicitly - a Blade that walks
        // relations lazily is how one mail send turns into eight queries.
        return new Content(
            markdown: 'emails.bookings.received',
            with: [
                'studentName' => $this->booking->student?->name,
                'courseTitle' => $this->booking->course?->title,
                'amount' => number_format((float) $this->booking->amount, 2),
                'status' => $this->booking->status,
                'bookedAt' => $this->booking->booked_at?->format('Y-m-d H:i'),
                'url' => config('app.frontend_url').'/bookings',
            ],
        );
    }

    /**
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
