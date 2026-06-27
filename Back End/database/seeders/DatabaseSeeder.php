<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin      = User::where('role', 'admin')->first();
        $instructor = User::where('role', 'instructor')->first();

        $instructor2 = User::firstOrCreate(
            ['email' => 'maya.hassan@gmail.com'],
            [
                'name'     => 'Maya Hassan',
                'password' => Hash::make('Maya2024'),
                'role'     => 'instructor',
            ]
        );

        $coursesData = [
            [
                'title'         => 'Python for Data Science',
                'description'   => 'Learn Python from scratch and apply it to real data science problems including pandas, numpy, and matplotlib.',
                'price'         => 299,
                'capacity'      => 35,
                'hours'         => 40,
                'status'        => 'active',
                'instructor_id' => $instructor->id,
                'start_date'    => now()->addDays(5),
                'end_date'      => now()->addDays(45),
            ],
            [
                'title'         => 'Web Development with Laravel',
                'description'   => 'Master Laravel framework from routing and controllers to APIs and authentication systems.',
                'price'         => 349,
                'capacity'      => 30,
                'hours'         => 50,
                'status'        => 'active',
                'instructor_id' => $instructor->id,
                'start_date'    => now()->addDays(10),
                'end_date'      => now()->addDays(60),
            ],
            [
                'title'         => 'React & TypeScript Bootcamp',
                'description'   => 'Build modern web applications using React 19 and TypeScript with hooks, context, and REST API integration.',
                'price'         => 399,
                'capacity'      => 25,
                'hours'         => 45,
                'status'        => 'active',
                'instructor_id' => $instructor->id,
                'start_date'    => now()->addDays(3),
                'end_date'      => now()->addDays(43),
            ],
            [
                'title'         => 'UI/UX Design Fundamentals',
                'description'   => 'Learn the principles of user interface and experience design using Figma. Create wireframes, prototypes, and design systems.',
                'price'         => 249,
                'capacity'      => 20,
                'hours'         => 30,
                'status'        => 'active',
                'instructor_id' => $instructor2->id,
                'start_date'    => now()->addDays(7),
                'end_date'      => now()->addDays(37),
            ],
            [
                'title'         => 'MySQL Database Administration',
                'description'   => 'Deep dive into MySQL including query optimization, indexing, stored procedures, and database design.',
                'price'         => 199,
                'capacity'      => 40,
                'hours'         => 25,
                'status'        => 'active',
                'instructor_id' => $instructor2->id,
                'start_date'    => now()->addDays(14),
                'end_date'      => now()->addDays(44),
            ],
            [
                'title'         => 'Digital Marketing Essentials',
                'description'   => 'Comprehensive course covering SEO, social media marketing, email campaigns, Google Ads, and analytics.',
                'price'         => 179,
                'capacity'      => 50,
                'hours'         => 20,
                'status'        => 'active',
                'instructor_id' => $instructor2->id,
                'start_date'    => now()->addDays(2),
                'end_date'      => now()->addDays(22),
            ],
            [
                'title'         => 'Cybersecurity Fundamentals',
                'description'   => 'Introduction to network security, ethical hacking basics, firewalls, encryption, and security best practices.',
                'price'         => 449,
                'capacity'      => 20,
                'hours'         => 60,
                'status'        => 'active',
                'instructor_id' => $instructor->id,
                'start_date'    => now()->addDays(20),
                'end_date'      => now()->addDays(80),
            ],
            [
                'title'         => 'Project Management Professional',
                'description'   => 'Prepare for PMP certification. Covers Agile, Scrum, Waterfall, risk management, and stakeholder communication.',
                'price'         => 299,
                'capacity'      => 30,
                'hours'         => 35,
                'status'        => 'active',
                'instructor_id' => $instructor2->id,
                'start_date'    => now()->addDays(1),
                'end_date'      => now()->addDays(36),
            ],
            [
                'title'         => 'Machine Learning with Python',
                'description'   => 'From linear regression to neural networks. Learn scikit-learn, TensorFlow basics, and model evaluation techniques.',
                'price'         => 499,
                'capacity'      => 20,
                'hours'         => 55,
                'status'        => 'draft',
                'instructor_id' => $instructor->id,
                'start_date'    => now()->addDays(30),
                'end_date'      => now()->addDays(90),
            ],
            [
                'title'         => 'English for Business Communication',
                'description'   => 'Improve professional English skills for emails, presentations, meetings, and negotiations in the workplace.',
                'price'         => 149,
                'capacity'      => 40,
                'hours'         => 24,
                'status'        => 'active',
                'instructor_id' => $instructor2->id,
                'start_date'    => now()->subDays(5),
                'end_date'      => now()->addDays(19),
            ],
        ];

        $courses = [];
        foreach ($coursesData as $data) {
            $courses[] = Course::firstOrCreate(['title' => $data['title']], $data);
        }

        $sessionsData = [
            ['course' => 0, 'title' => 'Introduction to Python Syntax',        'starts_at' => now()->addDays(5)->setTime(9,0),  'ends_at' => now()->addDays(5)->setTime(12,0),  'location' => 'Room A-101', 'max_attendees' => 35, 'status' => 'scheduled'],
            ['course' => 0, 'title' => 'Data Manipulation with Pandas',        'starts_at' => now()->addDays(7)->setTime(9,0),  'ends_at' => now()->addDays(7)->setTime(12,0),  'location' => 'Room A-101', 'max_attendees' => 35, 'status' => 'scheduled'],
            ['course' => 1, 'title' => 'Laravel Routing & Controllers',        'starts_at' => now()->addDays(10)->setTime(10,0), 'ends_at' => now()->addDays(10)->setTime(13,0), 'location' => 'Room B-202', 'max_attendees' => 30, 'status' => 'scheduled'],
            ['course' => 1, 'title' => 'Eloquent ORM & Database Relations',    'starts_at' => now()->addDays(12)->setTime(10,0), 'ends_at' => now()->addDays(12)->setTime(13,0), 'location' => 'Room B-202', 'max_attendees' => 30, 'status' => 'scheduled'],
            ['course' => 1, 'title' => 'Building RESTful APIs with Laravel',   'starts_at' => now()->addDays(15)->setTime(10,0), 'ends_at' => now()->addDays(15)->setTime(14,0), 'location' => 'Online - Zoom', 'max_attendees' => 30, 'status' => 'scheduled'],
            ['course' => 2, 'title' => 'React Hooks Deep Dive',                'starts_at' => now()->addDays(3)->setTime(14,0),  'ends_at' => now()->addDays(3)->setTime(17,0),  'location' => 'Room C-303', 'max_attendees' => 25, 'status' => 'scheduled'],
            ['course' => 2, 'title' => 'State Management with Context API',    'starts_at' => now()->addDays(6)->setTime(14,0),  'ends_at' => now()->addDays(6)->setTime(17,0),  'location' => 'Room C-303', 'max_attendees' => 25, 'status' => 'scheduled'],
            ['course' => 3, 'title' => 'Wireframing & Prototyping in Figma',   'starts_at' => now()->addDays(7)->setTime(11,0),  'ends_at' => now()->addDays(7)->setTime(14,0),  'location' => 'Design Lab', 'max_attendees' => 20, 'status' => 'scheduled'],
            ['course' => 5, 'title' => 'SEO Strategy & Google Analytics',      'starts_at' => now()->addDays(2)->setTime(9,0),   'ends_at' => now()->addDays(2)->setTime(11,0),  'location' => 'Online - Teams', 'max_attendees' => 50, 'status' => 'scheduled'],
            ['course' => 5, 'title' => 'Social Media Advertising Masterclass', 'starts_at' => now()->addDays(4)->setTime(9,0),   'ends_at' => now()->addDays(4)->setTime(11,0),  'location' => 'Online - Teams', 'max_attendees' => 50, 'status' => 'scheduled'],
            ['course' => 6, 'title' => 'Network Security Fundamentals',        'starts_at' => now()->addDays(20)->setTime(10,0), 'ends_at' => now()->addDays(20)->setTime(13,0), 'location' => 'Lab D-404',  'max_attendees' => 20, 'status' => 'scheduled'],
            ['course' => 7, 'title' => 'Agile & Scrum Methodology',            'starts_at' => now()->addDays(1)->setTime(9,0),   'ends_at' => now()->addDays(1)->setTime(12,0),  'location' => 'Room E-105', 'max_attendees' => 30, 'status' => 'scheduled'],
            ['course' => 7, 'title' => 'Risk Management in Projects',          'starts_at' => now()->addDays(8)->setTime(9,0),   'ends_at' => now()->addDays(8)->setTime(12,0),  'location' => 'Room E-105', 'max_attendees' => 30, 'status' => 'scheduled'],
            ['course' => 9, 'title' => 'Business Email Writing Workshop',      'starts_at' => now()->subDays(3)->setTime(16,0),  'ends_at' => now()->subDays(3)->setTime(18,0),  'location' => 'Room F-201', 'max_attendees' => 40, 'status' => 'completed'],
            ['course' => 9, 'title' => 'Presentation Skills in English',       'starts_at' => now()->addDays(5)->setTime(16,0),  'ends_at' => now()->addDays(5)->setTime(18,0),  'location' => 'Room F-201', 'max_attendees' => 40, 'status' => 'scheduled'],
        ];

        foreach ($sessionsData as $s) {
            $courseModel = $courses[$s['course']];
            TrainingSession::firstOrCreate(
                ['course_id' => $courseModel->id, 'title' => $s['title']],
                [
                    'description'   => 'Session covering ' . $s['title'] . ' in detail with hands-on exercises.',
                    'starts_at'     => $s['starts_at'],
                    'ends_at'       => $s['ends_at'],
                    'location'      => $s['location'],
                    'max_attendees' => $s['max_attendees'],
                    'status'        => $s['status'],
                ]
            );
        }

        $studentsData = [
            ['name' => 'Ahmed Al-Rashidi',    'email' => 'ahmed.rashidi@gmail.com',    'phone' => '0501234567', 'dob' => '1998-03-15'],
            ['name' => 'Sara Al-Mutairi',     'email' => 'sara.mutairi@hotmail.com',   'phone' => '0559876543', 'dob' => '2000-07-22'],
            ['name' => 'Omar Khalid',         'email' => 'omar.khalid@yahoo.com',      'phone' => '0531122334', 'dob' => '1997-11-08'],
            ['name' => 'Fatima Al-Zahrani',   'email' => 'fatima.zahrani@gmail.com',   'phone' => '0564455667', 'dob' => '2001-05-30'],
            ['name' => 'Khaled Al-Ghamdi',    'email' => 'khaled.ghamdi@gmail.com',    'phone' => '0508889990', 'dob' => '1995-09-12'],
            ['name' => 'Noura Bin Laden',     'email' => 'noura.bl@hotmail.com',       'phone' => '0572233445', 'dob' => '1999-01-17'],
            ['name' => 'Yusuf Al-Harbi',      'email' => 'yusuf.harbi@yahoo.com',      'phone' => '0543344556', 'dob' => '1996-06-25'],
            ['name' => 'Layla Al-Qahtani',    'email' => 'layla.qahtani@gmail.com',    'phone' => '0515566778', 'dob' => '2002-08-03'],
            ['name' => 'Hassan Al-Dosari',    'email' => 'hassan.dosari@hotmail.com',  'phone' => '0587788990', 'dob' => '1994-12-19'],
            ['name' => 'Mona Al-Shehri',      'email' => 'mona.shehri@gmail.com',      'phone' => '0529900112', 'dob' => '2000-04-07'],
            ['name' => 'Bilal Mahmoud',       'email' => 'bilal.mahmoud@yahoo.com',    'phone' => '0511223344', 'dob' => '1998-10-14'],
            ['name' => 'Rana Al-Otaibi',      'email' => 'rana.otaibi@gmail.com',      'phone' => '0553344556', 'dob' => '2001-02-28'],
            ['name' => 'Tariq Al-Anazi',      'email' => 'tariq.anazi@hotmail.com',    'phone' => '0525566778', 'dob' => '1997-07-11'],
            ['name' => 'Dalal Al-Bishi',      'email' => 'dalal.bishi@gmail.com',      'phone' => '0567788990', 'dob' => '1999-09-05'],
            ['name' => 'Majid Al-Subaie',     'email' => 'majid.subaie@yahoo.com',     'phone' => '0509900112', 'dob' => '1993-03-21'],
            ['name' => 'Hind Al-Shamrani',    'email' => 'hind.shamrani@gmail.com',    'phone' => '0571122334', 'dob' => '2002-11-16'],
            ['name' => 'Fares Al-Maliki',     'email' => 'fares.maliki@hotmail.com',   'phone' => '0543355667', 'dob' => '1996-05-09'],
            ['name' => 'Reem Al-Jadaan',      'email' => 'reem.jadaan@gmail.com',      'phone' => '0515577889', 'dob' => '2000-08-27'],
            ['name' => 'Nasser Al-Omari',     'email' => 'nasser.omari@yahoo.com',     'phone' => '0587799001', 'dob' => '1995-01-03'],
            ['name' => 'Ghada Al-Fayez',      'email' => 'ghada.fayez@gmail.com',      'phone' => '0529911223', 'dob' => '1998-06-18'],
        ];

        $students = [];
        foreach ($studentsData as $data) {
            $students[] = Student::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name'          => $data['name'],
                    'phone'         => $data['phone'],
                    'date_of_birth' => $data['dob'],
                ]
            );
        }

        $enrollmentPairs = [
            [0, 0], [0, 4],
            [1, 1], [1, 5],
            [2, 2], [2, 0],
            [3, 3], [3, 9],
            [4, 1], [4, 6],
            [5, 0], [5, 7],
            [6, 2], [6, 5],
            [7, 4], [7, 8],
            [8, 1], [8, 9],
            [9, 3], [9, 6],
            [10, 0], [10, 7],
            [11, 2], [11, 1],
            [12, 5], [12, 9],
            [13, 4], [13, 3],
            [14, 6], [14, 8],
        ];

        $statuses   = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled'];
        $enrollments = [];
        foreach ($enrollmentPairs as [$si, $ci]) {
            $e = Enrollment::firstOrCreate(
                ['student_id' => $students[$si]->id, 'course_id' => $courses[$ci]->id],
                [
                    'enrolled_at' => now()->subDays(rand(5, 60)),
                    'status'      => $statuses[array_rand($statuses)],
                ]
            );
            $enrollments[] = ['student' => $students[$si], 'course' => $courses[$ci], 'enrollment' => $e];
        }

        $paymentMethods = ['cash', 'credit_card', 'bank_transfer', 'credit_card', 'cash'];
        $bookingCount   = 0;

        foreach ($enrollments as $item) {
            if ($bookingCount >= 25) break;

            $student = $item['student'];
            $course  = $item['course'];

            $isPaid    = (rand(1, 10) > 3);
            $bookedAt  = now()->subDays(rand(3, 50));
            $paidAt    = $isPaid ? $bookedAt->copy()->addDays(rand(1, 5)) : null;

            Booking::firstOrCreate(
                ['student_id' => $student->id, 'course_id' => $course->id],
                [
                    'user_id'        => $admin->id,
                    'amount'         => $course->price,
                    'status'         => $isPaid ? 'confirmed' : 'pending',
                    'payment_status' => $isPaid ? 'paid' : 'unpaid',
                    'payment_method' => $isPaid ? $paymentMethods[array_rand($paymentMethods)] : null,
                    'transaction_id' => $isPaid ? 'TXN-' . strtoupper(substr(md5(uniqid()), 0, 10)) : null,
                    'booked_at'      => $bookedAt,
                    'paid_at'        => $paidAt,
                ]
            );

            $bookingCount++;
        }

        echo "Seeding complete:\n";
        echo '  Courses:          ' . Course::count()          . "\n";
        echo '  Students:         ' . Student::count()         . "\n";
        echo '  Training Sessions:' . \App\Models\TrainingSession::count() . "\n";
        echo '  Enrollments:      ' . Enrollment::count()      . "\n";
        echo '  Bookings:         ' . Booking::count()         . "\n";
    }
}
