<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Usage: ->middleware('role:admin') or 'role:admin,instructor'.
     * Always sits behind auth:sanctum - it authorizes, it does not authenticate.
     *
     * One parameterized middleware, not one class per role: an
     * InstructorMiddleware next to an AdminMiddleware is the trap here.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // Distinguish "not logged in" from "logged in as the wrong thing", or the
        // SPA cannot tell a dead token from a forbidden page.
        if (! $user) {
            return response()->json(['message' => __('auth.unauthenticated')], 401);
        }

        if (! in_array($user->role, $roles, true)) {
            return response()->json([
                'message' => __('auth.forbidden_role'),
                'required_roles' => $roles,
            ], 403);
        }

        return $next($request);
    }
}
