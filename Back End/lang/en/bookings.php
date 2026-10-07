<?php

return [
    // Raised by the capacity guard: StoreBookingRequest::after() (roles task)
    // and EnrollmentController::store(), when course_is_available() says no.
    'course_full' => 'This course is full or not open for booking.',
    'only_self' => 'You can only book a course for yourself.',

    // Shared by three things, on purpose: BookingCreated::toMail(), the
    // BookingConfirmed mailable's envelope, and the Blade body. One file to
    // translate, so lang/ar/bookings.php is a straight copy.
    'mail_subject' => 'Your booking for :course',
    'mail_heading' => 'Booking received',
    'mail_greeting' => 'Hello :name,',
    'mail_line' => 'We have recorded your booking for :course (:amount).',
    'mail_action' => 'View my bookings',
    'mail_footer' => 'If you did not make this booking, contact us and we will cancel it.',

    // Table labels in the mail body.
    'course' => 'Course',
    'amount' => 'Amount',
    'status' => 'Status',
    'booked_at' => 'Booked at',

    // The Blade renders __('bookings.status_'.$status), so these have to exist
    // for every value the bookings.status column can hold.
    'status_pending' => 'Pending',
    'status_confirmed' => 'Confirmed',
    'status_cancelled' => 'Cancelled',
];
