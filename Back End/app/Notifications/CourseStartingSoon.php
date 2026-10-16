<?php

namespace App\Notifications;

use App\Models\Course;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * "Your course starts in N days." Sent by the courses:remind-starting command.
 */
class CourseStartingSoon extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Course $course,
        public readonly int $daysAhead,
    ) {}

    /**
     * Mail only when there is an address to send to: students.email is
     * nullable, and the mail channel on a null address throws rather than
     * skipping.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return filled($notifiable->email ?? null)
            ? ['database', 'mail']
            : ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'course_starting_soon',
            'course_id' => $this->course->id,
            'course_title' => $this->course->title,
            'starts_on' => $this->course->start_date?->toDateString(),
            'days_ahead' => $this->daysAhead,
            'url' => '/courses?course='.$this->course->id,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('courses.reminder_subject', ['course' => $this->course->title]))
            ->greeting(__('courses.reminder_greeting', ['name' => $notifiable->name ?? '']))
            ->line(__('courses.reminder_line', [
                'course' => $this->course->title,
                'days' => $this->daysAhead,
                'date' => $this->course->start_date?->toFormattedDateString(),
            ]))
            ->action(__('courses.reminder_action'), config('app.frontend_url').'/enrollments');
    }
}
