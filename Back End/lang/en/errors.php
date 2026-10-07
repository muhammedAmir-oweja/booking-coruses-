<?php

return [
    // Returned by the named limiters in AppServiceProvider::boot(). Laravel's
    // default 429 body is "Too Many Attempts." - untranslatable and it does not
    // say what to do.
    'too_many_bookings' => 'Too many booking attempts. Please wait a minute and try again.',
    'too_many_requests' => 'Too many requests. Please slow down.',
];
