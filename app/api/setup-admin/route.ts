import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase Admin not initialized' }, { status: 500 });
        }

        const email = 'admin@shamieda.com';
        const password = 'admin123';

        // 1. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Admin Utama' }
        });

        if (authError) {
            // If user already exists, just update password
            if (authError.message.includes('already been registered')) {
                const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
                const existingUser = users.find(u => u.email === email);
                if (existingUser) {
                    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });

                    // Ensure profile exists and is manager
                    await supabaseAdmin.from('users').upsert({
                        auth_id: existingUser.id,
                        email: email,
                        full_name: 'Admin Utama',
                        role: 'manager',
                        position: 'Manager',
                        base_salary: 5000
                    }, { onConflict: 'email' });

                    return NextResponse.json({ message: 'Admin user updated. Login with admin@shamieda.com / admin123' });
                }
            }
            throw authError;
        }

        if (authData.user) {
            // 2. Create Public Profile
            const { error: profileError } = await supabaseAdmin
                .from('users')
                .insert({
                    auth_id: authData.user.id,
                    email: email,
                    full_name: 'Admin Utama',
                    role: 'manager',
                    position: 'Manager',
                    base_salary: 5000
                });

            if (profileError) throw profileError;
        }

        return NextResponse.json({ message: 'Admin user created. Login with admin@shamieda.com / admin123' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
