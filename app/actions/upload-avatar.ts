"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function uploadAvatarAction(formData: FormData) {
    try {
        if (!supabaseAdmin) {
            return { success: false, error: "Supabase Admin client is not initialized." };
        }

        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) {
            return { success: false, error: "File and User ID are required." };
        }

        // 1. Upload to Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('avatars')
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type
            });

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 3. Update User Profile
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .update({ avatar_url: publicUrl })
            .eq('id', userId);

        if (dbError) throw dbError;

        return { success: true, url: publicUrl };
    } catch (error: any) {
        console.error('Upload Avatar Error:', error);
        return { success: false, error: error.message };
    }
}
