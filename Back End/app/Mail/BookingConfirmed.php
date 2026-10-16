<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent when an admin confirms a booking - the message a student actually
 * waits for. BookingReceived is its counterpart at creation time, when the
 * booking is still pending.
 */
class BookingConfirmed extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Booking $booking) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('bookings.confirm_subject', ['course' => $this->booking->course?->title]),
        );
    }

    public function content(): Content
    {
        // Resolved here, not walked lazily in the Blade: one send must not
        // turn into a handful of queries.
        return new Content(
            markdown: 'emails.bookings.confirmed',
            with: [
                'studentName' => $this->booking->student?->name,
                'courseTitle' => $this->booking->course?->title,
                'amount' => number_format((float) $this->booking->amount, 2),
                'paymentStatus' => $this->booking->payment_status,
                'startsOn' => $this->booking->course?->start_date?->toFormattedDateString(),
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
