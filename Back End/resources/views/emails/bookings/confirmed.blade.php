<x-mail::message>
# {{ __('bookings.confirm_heading') }}

{{ __('bookings.mail_greeting', ['name' => $studentName]) }}

{{ __('bookings.confirm_line', ['course' => $courseTitle]) }}

<x-mail::table>
| | |
|:--- |:--- |
| {{ __('bookings.course') }} | **{{ $courseTitle }}** |
| {{ __('bookings.amount') }} | {{ $amount }} |
| {{ __('bookings.payment') }} | {{ __('bookings.payment_'.$paymentStatus) }} |
@if ($startsOn)
| {{ __('bookings.starts_on') }} | {{ $startsOn }} |
@endif
</x-mail::table>

<x-mail::button :url="$url">
{{ __('bookings.mail_action') }}
</x-mail::button>

{{ __('bookings.confirm_footer') }}
</x-mail::message>
