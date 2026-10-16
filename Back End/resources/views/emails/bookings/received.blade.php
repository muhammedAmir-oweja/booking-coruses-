<x-mail::message>
# {{ __('bookings.mail_heading') }}

{{ __('bookings.mail_greeting', ['name' => $studentName]) }}

{{ __('bookings.mail_line', ['course' => $courseTitle, 'amount' => $amount]) }}

<x-mail::table>
| | |
|:--- |:--- |
| {{ __('bookings.course') }} | **{{ $courseTitle }}** |
| {{ __('bookings.amount') }} | {{ $amount }} |
| {{ __('bookings.status') }} | {{ __('bookings.status_'.$status) }} |
| {{ __('bookings.booked_at') }} | {{ $bookedAt }} |
</x-mail::table>

<x-mail::button :url="$url">
{{ __('bookings.mail_action') }}
</x-mail::button>

{{ __('bookings.mail_footer') }}
</x-mail::message>
