"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function onboardStaffAction(formData: any) {
    try {
        if (!supabaseAdmin) {
            return { success: false, error: "Supabase Admin client is not initialized. Sila semak fail .env.local anda." };
        }

        // 1. Create or Get User in Supabase Auth
        let authData;
        const { data: newAuthData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email,
            password: formData.password,
            email_confirm: true,
            user_metadata: {
                full_name: formData.fullName
            }
        });

        if (authError) {
            if (authError.message.includes("already been registered")) {
                console.log(`User ${formData.email} already exists in Auth. Fetching existing user...`);
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                if (listError) throw listError;

                const existingUser = users.find(u => u.email?.toLowerCase() === formData.email.toLowerCase());
                if (existingUser) {
                    authData = { user: existingUser };
                    // Update password to match what was just entered
                    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                        password: formData.password
                    });
                } else {
                    throw authError;
                }
            } else {
                throw authError;
            }
        } else {
            authData = newAuthData;
        }

        if (authData.user) {
            console.log(`Upserting profile for ${formData.email} (Auth ID: ${authData.user.id})...`);
            // 2. Update the profile in public.users
            const { error: profileError } = await supabaseAdmin
                .from('users')
                .upsert({
                    auth_id: authData.user.id,
                    full_name: formData.fullName,
                    email: formData.email,
                    ic_number: formData.icNumber,
                    phone: formData.phone,
                    address: formData.address,
                    position: formData.position,
                    base_salary: parseFloat(formData.basicSalary),
                    start_date: formData.startDate,
                    bank_name: formData.bankName,
                    bank_account: formData.bankAccount,
                    role: 'staff',
                    onboarding_kit: formData.onboardingKit || [],
                    ic_front_url: formData.icFrontUrl,
                    ic_back_url: formData.icBackUrl,
                    emergency_contacts: formData.emergencyContacts || []
                }, {
                    onConflict: 'email'
                });

            if (profileError) throw profileError;
        }

        return { success: true };
    } catch (error: any) {
        console.error('Onboarding Error:', error);
        return { success: false, error: error.message };
    }
}
