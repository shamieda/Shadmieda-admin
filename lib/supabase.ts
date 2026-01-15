import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Please check .env.local');
}

export const supabase = createBrowserClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
        cookies: {
            get(name: string) {
                if (typeof document === 'undefined') return undefined;
                const cookie = document.cookie
                    .split('; ')
                    .find((row) => row.startsWith(`${name}=`));
                return cookie ? cookie.split('=')[1] : undefined;
            },
            set(name: string, value: string, options: any) {
                if (typeof document === 'undefined') return;
                let cookieStr = `${name}=${value}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax; Secure`;
                document.cookie = cookieStr;
            },
            remove(name: string, options: any) {
                if (typeof document === 'undefined') return;
                document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
            },
        },
    }
);
