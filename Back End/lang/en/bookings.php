<?php

return [
    // Raised by the capacity guard in BookingController::store() and
    // EnrollmentController::store() when course_is_available() says no.
    'course_full' => 'This course is full or no longer open for booking.',
    'only_self' => 'You may only book for yourself.',

    // BookingCreated::toMail(). The mail section reuses these for the mailable.
    'mail_subject' => 'Booking confirmed: :course',
    'mail_greeting' => 'Hello :name,',
    'mail_line' => 'A booking for :course has been created for an amount of :amount.',
    'mail_action' => 'View booking',
];
