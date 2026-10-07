<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    /**
     * Named limiters live here and are referenced by string from routes/api.php,
     * so the route file stays readable and all four ceilings are reviewable in
     * one diff. Counters live in the cache table (CACHE_STORE=database), so
     * `php artisan cache:clear` resets a window.
     */
    public function boot(): void
    {
        // Bookings: the real target. Keyed by user id so one noisy account cannot
        // lock out everyone behind the same NAT - and in dev that is you.
        RateLimiter::for('bookings', function (Request $request) {
            return Limit::perMinute(5)
                ->by($request->user()?->id ?: $request->ip())
                // $headers carries Retry-After and the X-RateLimit-* trio. A
                // custom response() that ignores it ships a 429 with no
                // Retry-After, and the SPA then falls back to a hardcoded 60s
                // forever - pass them through.
                ->response(fn (Request $request, array $headers) => response()->json([
                    'message' => __('errors.too_many_bookings'),
                ], 429, $headers));
        });

        // Login + register: the brute-force surface. Keyed by email AND ip, so
        // guessing one account from many hosts and many accounts from one host
        // are both limited. Returning an array means both limits apply - the
        // by() prefixes keep the two buckets from colliding.
        RateLimiter::for('login', function (Request $request) {
            return [
                Limit::perMinute(5)->by('email:'.(string) $request->input('email')),
                Limit::perMinute(20)->by('ip:'.$request->ip()),
            ];
        });

        // File uploads: few per minute, they are expensive and large.
        RateLimiter::for('uploads', fn (Request $request) => Limit::perMinute(10)
            ->by($request->user()?->id ?: $request->ip()));

        // The floor under every other api route. Admins get more headroom
        // because the dashboard fires several requests per page.
        RateLimiter::for('api', function (Request $request) {
            return $request->user()?->isAdmin()
                ? Limit::perMinute(240)->by($request->user()->id)
                : Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
