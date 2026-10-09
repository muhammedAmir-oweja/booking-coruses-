<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePreferencesRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;

class PreferenceController extends Controller
{
    private const COOKIE = 'prefs';

    private const ONE_YEAR = 60 * 24 * 365;   // minutes, not seconds

    private const DEFAULTS = [
        'locale' => 'en',
        'theme' => 'light',
        'sidebar_collapsed' => false,
        'per_page' => 10,
    ];

    public function show(Request $request): JsonResponse
    {
        return response()->json($this->read($request));
    }

    public function update(UpdatePreferencesRequest $request): JsonResponse
    {
        // Merge, do not replace: the SPA sends only what changed.
        $prefs = [...$this->read($request), ...$request->validated()];

        $cookie = Cookie::make(
            name: self::COOKIE,
            value: json_encode($prefs),
            minutes: self::ONE_YEAR,
            path: '/',
            domain: null,
            secure: $request->secure(),
            // httpOnly MUST be false: the React app reads this one directly, so
            // it never has to wait for a round trip to paint the right theme.
            httpOnly: false,
            raw: false,
            sameSite: 'lax',
        );

        // Attached to the response, not Cookie::queue(). The queue is flushed by
        // AddQueuedCookiesToResponse, which on api routes only runs inside
        // Sanctum's stateful pipeline - and making this SPA stateful switches on
        // CSRF validation it cannot satisfy (see the note in .env). withCookie()
        // needs none of that machinery.
        return response()->json($prefs)->withCookie($cookie);
    }

    /**
     * A cookie is client input: a hand-edited value must not blow up the app,
     * so anything unparseable falls back to the defaults.
     *
     * @return array<string, mixed>
     */
    private function read(Request $request): array
    {
        $raw = json_decode((string) $request->cookie(self::COOKIE, '{}'), true);

        return [...self::DEFAULTS, ...(is_array($raw) ? $raw : [])];
    }
}
