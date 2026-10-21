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

        // One login, one device: every earlier token for this user goes.
        if (method_exists($user, 'tokens')) {
            $user->tokens()->delete();
        }

        return response()->json($this->issueTokens($user));
    }

    /**
     * Exchanges a valid refresh token for a new pair.
     *
     * Reached only by a token carrying the 'refresh' ability - see the
     * abilities:refresh middleware on the route. An access token cannot call
     * this, which is the whole point of splitting them: the short-lived token
     * the SPA sends on every request has no power to extend its own life.
     */
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();

        // Rotation. The refresh token that was just spent is destroyed and a
        // new one issued, so a leaked refresh token is good for one use at
        // most - and the real user's next refresh fails loudly instead of the
        // theft going unnoticed forever.
        $request->user()->currentAccessToken()?->delete();

        // The old access token goes too: it was minted alongside the refresh
        // token being replaced, and leaving it alive would mean two valid
        // access tokens after every renewal.
        $user->tokens()->where('name', 'access')->delete();

        return response()->json($this->issueTokens($user));
    }

    /**
     * The access/refresh pair, with the lifetimes from config/sanctum.php.
     *
     * Abilities are what separate them. The access token deliberately does
     * NOT get ['*']: a wildcard satisfies every ability check, including
     * abilities:refresh, and the split would be decorative.
     *
     * @return array<string, mixed>
     */
    private function issueTokens($user): array
    {
        $accessTtl = (int) config('sanctum.access_ttl', 60);
        $refreshTtl = (int) config('sanctum.refresh_ttl', 60 * 24 * 30);

        $access = $user->createToken('access', ['access'], now()->addMinutes($accessTtl));
        $refresh = $user->createToken('refresh', ['refresh'], now()->addMinutes($refreshTtl));

        return [
            // `token` is kept as an alias of the access token so nothing that
            // already reads this field breaks.
            'token' => $access->plainTextToken,
            'access_token' => $access->plainTextToken,
            'refresh_token' => $refresh->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => $accessTtl * 60,          // seconds, as OAuth clients expect
            'refresh_expires_in' => $refreshTtl * 60,
            'user' => $user,
        ];
    }

    public function logout(Request $request): JsonResponse
    {
        // Revoke the refresh token too, so a logged-out session cannot be renewed.
        $request->user()->tokens()->delete();

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

        // The same pair login issues. It used to mint a single 'api-token'
        // with Sanctum's default ['*'] ability and no expiry - which never
        // lapsed, and, because a wildcard satisfies every ability check,
        // could call /auth/refresh as well. Registering handed out a stronger
        // credential than logging in.
        return response()->json($this->issueTokens($user), 201);
    }
}
