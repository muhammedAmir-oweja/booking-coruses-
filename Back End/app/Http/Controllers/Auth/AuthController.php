<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

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

        return response()->json(['message' => __('messages.logged_out')]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => __('messages.password_incorrect'),
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        $user->update(['password' => Hash::make($data['password'])]);

        return response()->json(['message' => __('messages.password_changed')]);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            ...$data,
            // 'password' => 'hashed' is already in User::casts(), so no Hash::make.
            'role' => $data['role'] ?? 'student',
        ]);

        // BookingPolicy::create() requires $user->student, and students.user_id
        // is nullable - so without this row a freshly registered student gets a
        // 403 on their first booking with nothing in the UI to explain it. We
        // create it here rather than leaving it for an admin to link later.
        if ($user->isStudent()) {
            // firstOrCreate, not create: students.email is unique, so if an
            // admin had already added this person to the roster, registering
            // links the two rows instead of throwing a duplicate-key 500.
            Student::firstOrCreate(
                ['email' => $user->email],
                ['user_id' => $user->id, 'name' => $user->name],
            )->forceFill(['user_id' => $user->id])->save();
        }

        return response()->json([
            'token' => $user->createToken('api-token')->plainTextToken,
            'user' => $user,
        ], 201);
    }
}
