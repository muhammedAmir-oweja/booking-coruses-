<?php

return [
    // The :model template survives translation here: Arabic puts the verb
    // before the noun, so "تم حذف الدورة بنجاح" reads naturally. If a future
    // key does not fit the template, split it - the two files only have to
    // share keys, not structure.
    'deleted' => 'تم حذف :model بنجاح.',
    'booking_cancelled' => 'تم إلغاء الحجز بنجاح.',
    'logged_out' => 'تم تسجيل الخروج بنجاح.',
    'password_changed' => 'تم تغيير كلمة المرور بنجاح.',
    'password_incorrect' => 'كلمة المرور الحالية غير صحيحة.',
    'document_foreign' => 'هذا المستند لا ينتمي إلى هذا الطالب.',

    'models' => [
        'course' => 'الدورة',
        'student' => 'الطالب',
        'user' => 'المستخدم',
        'enrollment' => 'التسجيل',
        'training_session' => 'الجلسة التدريبية',
        'document' => 'المستند',
    ],
];
