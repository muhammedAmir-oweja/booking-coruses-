<?php

use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Laravel\Sanctum\Sanctum;

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Requests from the following domains / hosts will receive stateful API
    | authentication cookies. Typically, these should include your local
    | and production domains which access your API via a frontend SPA.
    |
    */

    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
        Sanctum::currentApplicationUrlWithPort(),
        // Sanctum::currentRequestHost(),
    ))),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    |
    | This array contains the authentication guards that will be checked when
    | Sanctum is trying to authenticate a request. If none of these guards
    | are able to authenticate the request, Sanctum will use the bearer
    | token that's present on an incoming request for authentication.
    |
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | This value controls the number of minutes until an issued token will be
    | considered expired. This will override any values set in the token's
    | "expires_at" attribute, but first-party sessions are not affected.
    |
    */

    // Deliberately null, and that is load-bearing.
    //
    // Guard.php checks BOTH the global value and the row's own expires_at,
    // and a token has to pass both. So a global 60 minutes would kill the
    // 30-day refresh token after an hour as well - the pair could not exist.
    // Lifetimes are therefore set per token in AuthController, which is the
    // only place tokens are issued:
    //
    //   access   sanctum.access_ttl   ability ['access']
    //   refresh  sanctum.refresh_ttl  ability ['refresh']
    //
    // sanctum:prune-expired still clears them: its first pass deletes by
    // expires_at, which both tokens now carry.
    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Access / refresh lifetimes (minutes)
    |--------------------------------------------------------------------------
    |
    | Not Sanctum's own keys - this project's. The short access lifetime is
    | what makes a stolen token cheap; the long refresh lifetime is what keeps
    | the user from logging in every hour.
    |
    */

    'access_ttl' => (int) env('SANCTUM_ACCESS_TTL', 60),
    'refresh_ttl' => (int) env('SANCTUM_REFRESH_TTL', 60 * 24 * 30),

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    |
    | Sanctum can prefix new tokens in order to take advantage of numerous
    | security scanning initiatives maintained by open source platforms
    | that notify developers if they commit tokens into repositories.
    |
    | See: https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning
    |
    */

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    |
    | When authenticating your first-party SPA with Sanctum you may need to
    | customize some of the middleware Sanctum uses while processing the
    | request. You may change the middleware listed below as required.
    |
    */

    'middleware' => [
        'authenticate_session' => AuthenticateSession::class,
        'encrypt_cookies' => EncryptCookies::class,
        'validate_csrf_token' => ValidateCsrfToken::class,
    ],

];
