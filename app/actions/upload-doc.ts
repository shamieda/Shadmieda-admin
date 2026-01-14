"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function uploadStaffDocAction(formData: FormData) {
    try {
        if (!supabaseAdmin) {
            throw new Error("Supabase Admin client is not initialized. Check environment variables.");
        }

        const file = formData.get('file') as File;
        const fileName = formData.get('fileName') as string;
        const bucket = 'staff-docs';

        if (!file) throw new Error("File is missing in FormData.");
        if (!fileName) throw new Error("FileName is missing in FormData.");

        console.log(`Uploading ${fileName} (${file.size} bytes, ${file.type}) to ${bucket}...`);

        // Convert File to Buffer for server-side upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (error) {
            console.error("Supabase Upload Error:", error);
            return { success: false, error: error.message || "Unknown Supabase error" };
        }

        console.log("Upload successful:", data.path);
        return { success: true, path: data.path };
    } catch (error: any) {
        console.error('Unexpected Upload Doc Error:', error);
        return { success: false, error: error.message || "An unexpected error occurred during upload." };
    }
}
