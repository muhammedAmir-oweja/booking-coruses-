<?php

use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();

        // Without this line the 'api' limiter in AppServiceProvider is never
        // consulted - the api group has no throttle entry at all by default.
        $middleware->throttleApi();

        $middleware->prepend(HandleCors::class);
        // Cookies are encrypted by default, so document.cookie would see
        // ciphertext. Exempt this one - it holds no secrets, only display
        // settings. Never exempt the session or XSRF cookie.
        $middleware->encryptCookies(except: ['prefs']);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            // Sanctum provides these classes but registers no alias for them.
            // 'abilities' requires ALL listed abilities, 'ability' any one.
            'abilities' => CheckAbilities::class,
            'ability' => CheckForAnyAbility::class,
        ]);

        // Appended, not prepended: it has to run after Sanctum's stateful
        // middleware or $request->cookie('prefs') is not readable yet, and the
        // cookie source would silently return nothing while the header source
        // kept working. Task 26 relies on this same line.
        $middleware->appendToGroup('api', [SetLocale::class]);

        // ...but group order alone is not enough. ThrottleRequests sits in the
        // framework's middleware priority list, which reorders the combined
        // stack and pulls it ahead of anything unprioritized - so a 429 body was
        // being built before the locale was resolved, and came out English for
        // an Arabic request. Naming SetLocale just before it in that list fixes
        // the ordering without touching the group.
        $middleware->prependToPriorityList(ThrottleRequests::class, SetLocale::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
