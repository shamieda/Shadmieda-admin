"use server";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function getNotificationsAction() {
    console.log("SERVER DEBUG: getNotificationsAction started");
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log("SERVER DEBUG: No user found");
            return { success: false, error: "Unauthorized" };
        }
        console.log("SERVER DEBUG: User found:", user.id);

        const { data: profile } = await supabase
            .from("users")
            .select("id")
            .eq("auth_id", user.id)
            .single();

        if (!profile) {
            console.log("SERVER DEBUG: No profile found for auth_id:", user.id);
            return { success: false, error: "Profile not found" };
        }
        console.log("SERVER DEBUG: Profile found:", profile.id);

        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) throw error;
        console.log("SERVER DEBUG: Notifications fetched:", data?.length);

        // DEBUG: Check FCM tokens
        const { data: tokens } = await supabaseAdmin
            .from("fcm_tokens")
            .select("token")
            .eq("user_id", profile.id);
        console.log("SERVER DEBUG: FCM Tokens for user:", profile.id, tokens?.length || 0);

        return { success: true, notifications: data };
    } catch (error: any) {
        console.error("SERVER DEBUG: Error fetching notifications:", error);
        return { success: false, error: error.message };
    }
}

export async function markAsReadAction(notificationId: string) {
    console.log("SERVER DEBUG: markAsReadAction started for:", notificationId);
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId);

        if (error) throw error;

        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("SERVER DEBUG: Error marking notification as read:", error);
        return { success: false, error: error.message };
    }
}

export async function markAllAsReadAction() {
    console.log("SERVER DEBUG: markAllAsReadAction started");
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Unauthorized" };

        const { data: profile } = await supabase
            .from("users")
            .select("id")
            .eq("auth_id", user.id)
            .single();

        if (!profile) return { success: false, error: "Profile not found" };

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", profile.id)
            .eq("is_read", false);

        if (error) throw error;

        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("SERVER DEBUG: Error marking all notifications as read:", error);
        return { success: false, error: error.message };
    }
}

export async function broadcastNotificationAction({
    title,
    message,
    type = "info",
    category = "system",
    targetRole = "staff",
    targetPosition,
    link
}: {
    title: string;
    message: string;
    type?: "info" | "warning" | "success" | "error";
    category?: "attendance" | "advance" | "task" | "system";
    targetRole?: "all" | "staff" | "manager" | "admin" | "master";
    targetPosition?: string;
    link?: string;
}) {
    console.log("SERVER DEBUG: broadcastNotificationAction started");
    try {
        if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");

        const { error } = await supabaseAdmin
            .from("broadcast_notifications")
            .insert({
                title,
                message,
                type,
                category,
                target_role: targetRole,
                target_position: targetPosition,
                link
            });

        if (error) {
            console.error("SERVER DEBUG: Broadcast Insert error:", error);
            throw error;
        }

        console.log("SERVER DEBUG: Broadcast created successfully");

        // Note: Individual FCM pushes for everyone in a broadcast 
        // would be complex to trigger from here without fetching all users.
        // For now, this handles the DB/UI notification.
        // Real-time listener in the client will pick this up for active users.

        return { success: true };
    } catch (error: any) {
        console.error("SERVER DEBUG: Error broadcasting notification:", error);
        return { success: false, error: error.message };
    }
}

import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export async function createNotificationAction({
    userId,
    title,
    message,
    type = "info",
    category = "system",
    link
}: {
    userId: string;
    title: string;
    message: string;
    type?: "info" | "warning" | "success" | "error";
    category?: "attendance" | "advance" | "task" | "system";
    link?: string;
}) {
    console.log("SERVER DEBUG: createNotificationAction started for user:", userId);
    try {
        if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");

        const { error } = await supabaseAdmin
            .from("notifications")
            .insert({
                user_id: userId,
                title,
                message,
                type,
                category,
                link
            });

        if (error) {
            console.error("SERVER DEBUG: Insert error:", error);
            throw error;
        }

        console.log("SERVER DEBUG: Notification created successfully");

        // Send FCM Push
        try {
            console.log("SERVER DEBUG: Fetching FCM tokens for user:", userId);
            const { data: tokens } = await supabaseAdmin
                .from("fcm_tokens")
                .select("token")
                .eq("user_id", userId);

            if (tokens && tokens.length > 0) {
                const fcmTokens = tokens.map((t: { token: string }) => t.token);
                console.log(`SERVER DEBUG: Sending FCM to ${fcmTokens.length} tokens using project: ${process.env.FIREBASE_PROJECT_ID}`);

                console.log(`SERVER DEBUG: Sending FCM to ${fcmTokens.length} tokens. Project: ${process.env.FIREBASE_PROJECT_ID}`);

                // Dual payload (Both 'notification' and 'data')
                // This is the most compatible way.
                const payload = {
                    notification: {
                        title: title,
                        body: message,
                    },
                    data: {
                        title: title,
                        body: message,
                        url: link || '/',
                    },
                    webpush: {
                        headers: {
                            Urgency: 'high'
                        },
                        notification: {
                            icon: '/logo.png',
                            badge: '/logo.png',
                            tag: 'shamieda-noti',
                            renotify: true
                        }
                    }
                };

                const messages = fcmTokens.map((token: string) => {
                    console.log(`SERVER DEBUG: Target Token (first 10): ${token.substring(0, 10)}...`);
                    return {
                        ...payload,
                        token: token,
                    };
                });

                const response = await admin.messaging().sendEach(messages);
                console.log('SERVER DEBUG: FCM Push response:', JSON.stringify(response));

                // Cleanup invalid tokens
                if (response.failureCount > 0) {
                    response.responses.forEach(async (resp, idx) => {
                        if (!resp.success && resp.error) {
                            const errorCode = (resp.error as any).code;
                            if (errorCode === 'messaging/registration-token-not-registered' ||
                                errorCode === 'messaging/invalid-registration-token') {
                                console.log(`SERVER DEBUG: Removing invalid token: ${fcmTokens[idx]}`);
                                await supabaseAdmin
                                    .from('fcm_tokens')
                                    .delete()
                                    .eq('token', fcmTokens[idx]);
                            }
                        }
                    });
                }
            } else {
                console.warn("SERVER DEBUG: No FCM tokens found for userId", userId);
            }
        } catch (pushFetchError) {
            console.error("SERVER DEBUG: Error sending FCM push:", pushFetchError);
        }

        return { success: true };
    } catch (error: any) {
        console.error("SERVER DEBUG: Error creating notification:", error);
        return { success: false, error: error.message };
    }
}

export async function sendTestNotificationAction() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const { data: profile } = await supabase
            .from("users")
            .select("id")
            .eq("auth_id", user.id)
            .single();

        if (!profile) return { success: false, error: "Profile not found" };

        const { data: tokens } = await supabaseAdmin
            .from("fcm_tokens")
            .select("token")
            .eq("user_id", profile.id);

        const result = await createNotificationAction({
            userId: profile.id,
            title: "Test Notifikasi",
            message: "Ini adalah cubaan notifikasi untuk debug.",
            type: "info",
            category: "system"
        });

        return {
            ...result,
            debug: {
                tokenCount: tokens?.length || 0,
                firstToken: tokens?.[0]?.token?.substring(0, 15) + "..."
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getManagersAction() {
    try {
        if (!supabaseAdmin) {
            console.error("Supabase Admin not initialized in getManagersAction");
            return { success: false, error: "Server configuration error" };
        }

        const { data, error } = await supabaseAdmin
            .from("users")
            .select("id")
            .in("role", ["manager", "admin", "master"]);

        if (error) throw error;
        return { success: true, managers: data };
    } catch (error: any) {
        console.error("Error fetching managers:", error);
        return { success: false, error: error.message };
    }
}

export async function notifyStationStaffAction(station: string, taskTitle: string) {
    console.log("SERVER DEBUG: notifyStationStaffAction started for:", station);
    try {
        if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");

        // Get current user to exclude self
        const supabase = await createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        let query = supabaseAdmin
            .from("users")
            .select("id")
            .eq("role", "staff"); // Base filter: Staff only

        // Exclude self (Admin/Manager creating the task)
        if (currentUser) {
            query = query.neq("auth_id", currentUser.id);
        }

        // Refine filter based on station
        const normalizedStation = station.toLowerCase();
        if (normalizedStation !== 'semua staff' && normalizedStation !== 'staff') {
            query = query.ilike('position', station);
        }

        const { data: staffList, error } = await query;

        if (error) {
            console.error("SERVER DEBUG: Error fetching staff for station:", station, error);
            throw error;
        }

        console.log(`SERVER DEBUG: Found ${staffList?.length || 0} staff for station: ${station}`);

        if (staffList && staffList.length > 0) {
            const message = `Tugasan baru "${taskTitle}" telah ditambah untuk anda.`;

            // Send notifications in parallel
            await Promise.all(staffList.map(async (user: any) => {
                try {
                    await createNotificationAction({
                        userId: user.id,
                        title: "Tugasan Baru",
                        message: message,
                        type: "info",
                        category: "task",
                        link: "/staff/tasks"
                    });
                } catch (err) {
                    console.error(`SERVER DEBUG: Failed to notify user ${user.id}`, err);
                }
            }));
        }

        return { success: true, count: staffList?.length || 0 };
    } catch (error: any) {
        console.error("SERVER DEBUG: Error in notifyStationStaffAction:", error);
        return { success: false, error: error.message };
    }
}
