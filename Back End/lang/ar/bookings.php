<?php

return [
    // Arabic twin of lang/en/bookings.php - same keys, nothing more.
    'course_full' => 'هذه الدورة مكتملة أو غير متاحة للحجز.',
    'only_self' => 'يمكنك الحجز لنفسك فقط.',

    'mail_subject' => 'حجزك في دورة :course',
    'mail_heading' => 'تم استلام الحجز',
    'mail_greeting' => 'مرحبًا :name،',
    'mail_line' => 'لقد سجّلنا حجزك في دورة :course (:amount).',
    'mail_action' => 'عرض حجوزاتي',
    'mail_footer' => 'إذا لم تقم بهذا الحجز، تواصل معنا وسنقوم بإلغائه.',

    'course' => 'الدورة',
    'amount' => 'المبلغ',
    'status' => 'الحالة',
    'booked_at' => 'تاريخ الحجز',

    'status_pending' => 'قيد الانتظار',
    'status_confirmed' => 'مؤكد',
    'status_cancelled' => 'ملغى',

    // Task 29: the confirmation mail, sent by SendBookingConfirmedMail when
    // a booking moves into 'confirmed'.
    'confirm_subject' => 'تم تأكيد حجزك في :course',
    'confirm_heading' => 'تم تأكيد الحجز',
    'confirm_line' => 'خبر سار - تم تأكيد مقعدك في :course.',
    'confirm_footer' => 'بانتظارك. راسلنا على هذا البريد إذا احتجت أي تعديل.',
    'payment' => 'الدفع',
    'payment_paid' => 'مدفوع',
    'payment_unpaid' => 'غير مدفوع',
    'payment_refunded' => 'مُسترد',
    'starts_on' => 'تبدأ في',
];
