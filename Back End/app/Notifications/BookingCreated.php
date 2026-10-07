<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Models\Student;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BookingCreated extends Notification
{
    use Queueable;

    public function __construct(public readonly Booking $booking) {}

    /**
     * Get the notification's delivery channels.
     *
     * The student's email is the BookingConfirmed mailable's job (dispatched by
     * SendBookingConfirmationMail on the same event). Adding 'mail' here for
     * them too would put two near-identical messages in one inbox - that is the
     * duplicate this split avoids. Admins have no mailable, so they get this
     * one by mail as well as in the bell.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return $notifiable instanceof Student
            ? ['database']
            : ['database', 'mail'];
    }

    /**
     * What the bell renders. Self-contained on purpose: the frontend must never
     * need a second request to draw a row.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'booking_created',
            'booking_id' => $this->booking->id,
            'course_id' => $this->booking->course_id,
            'course_title' => $this->booking->course?->title,
            'student_id' => $this->booking->student_id,
            'student_name' => $this->booking->student?->name,
            'amount' => (float) $this->booking->amount,
            'url' => '/bookings?booking='.$this->booking->id,
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('bookings.mail_subject', ['course' => $this->booking->course?->title]))
            ->greeting(__('bookings.mail_greeting', ['name' => $notifiable->name]))
            ->line(__('bookings.mail_line', [
                'course' => $this->booking->course?->title,
                'amount' => number_format((float) $this->booking->amount, 2),
            ]))
            ->action(__('bookings.mail_action'), config('app.frontend_url').'/bookings');
    }
}
