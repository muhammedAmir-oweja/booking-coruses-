<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Handle an incoming request.
     *
     * Three sources, most explicit first: the X-Locale header, then the prefs
     * cookie, then the configured default. Anything unsupported falls through
     * rather than being trusted.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $supported = ['en', 'ar'];

        // 1. an explicit header wins - this is how the SPA forces a language
        $locale = $request->header('X-Locale');

        // 2. then the preferences cookie (task 26 writes it; harmless before that)
        if (! in_array($locale, $supported, true)) {
            $prefs = json_decode((string) $request->cookie('prefs', '{}'), true);
            $locale = is_array($prefs) ? ($prefs['locale'] ?? null) : null;
        }

        // 3. then config('app.locale')
        if (! in_array($locale, $supported, true)) {
            $locale = config('app.locale');
        }

        App::setLocale($locale);

        return $next($request);
    }
}
