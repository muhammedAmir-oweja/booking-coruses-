<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt(['email' => $data['email'], 'password' => $data['password']])) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::user();

        // Only delete Sanctum personal access tokens when the user model supports them.
        if (method_exists($user, 'tokens')) {
            $user->tokens()->delete();
        }

        // `createToken()` is provided by Laravel Sanctum's HasApiTokens trait.
        // If that trait is not present on the model, generate a safe fallback token
        // instead of throwing an undefined method error.
        $token = null;
        if (method_exists($user, 'createToken')) {
            $token = $user->createToken('api-token')->plainTextToken;
        } else {
            $token = hash('sha256', Str::random(60));
            if (property_exists($user, 'remember_token')) {
                $user->remember_token = $token;

                // Some authenticatable implementations expose a remember_token
                // property but do not support Eloquent save(), so guard it.
                if (method_exists($user, 'save')) {
                    $user->save();
                }
            }
        }

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Null-safe: under DEV_NO_AUTH the user is signed in without a token.
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'The current password is incorrect.',
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        $user->update(['password' => Hash::make($data['password'])]);

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
