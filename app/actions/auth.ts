"use server";

import { cookies } from "next/headers";
import { savePersistentSession, SESSION_COOKIE_NAME } from "@/lib/session-recovery";

export async function persistSessionAction(userId: string, refreshToken: string) {
    const sessionId = await savePersistentSession(userId, refreshToken);

    if (sessionId) {
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
        });
        return { success: true };
    }

    return { success: false, error: "Failed to persist session" };
}

export async function clearPersistSessionAction() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}
