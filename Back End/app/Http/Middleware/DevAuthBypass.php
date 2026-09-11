<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

/**
 * Dev-only. Signs every API request in as an admin so the admin app can be
 * built without a login flow. Switched on by DEV_NO_AUTH=true in .env, and it
 * refuses to run anywhere but the local environment.
 *
 * To go back to real auth: set DEV_NO_AUTH=false. To remove it for good:
 * delete this file and the $adminOnly branch in routes/api.php.
 */
class DevAuthBypass
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(
            config('app.dev_no_auth') && app()->environment('local'),
            403,
            'Dev auth bypass is not available in this environment.'
        );

        Auth::setUser($this->devAdmin());

        return $next($request);
    }

    private function devAdmin(): User
    {
        return User::where('role', 'admin')->first() ?? User::create([
            'name' => 'Dev Admin',
            'email' => 'dev-admin@local.test',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);
    }
}
