<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,            // uuid, not an int
                'data' => $n->data,
                'read_at' => $n->read_at?->toDateTimeString(),
                'created_at' => $n->created_at->toDateTimeString(),
            ]);

        return response()->json([
            'data' => $notifications,
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        // Its own endpoint so the bell can poll it cheaply.
        return response()->json([
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        // Scoped to the user's own relation, so someone else's uuid is a 404 -
        // never a successful write. This is the whole authorization story here.
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['message' => __('notifications.marked_read')]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        // One UPDATE, not one per row.
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['message' => __('notifications.all_marked_read')]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->findOrFail($id)->delete();

        return response()->json(['message' => __('notifications.deleted')]);
    }
}
