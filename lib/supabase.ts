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
                const date = new Date();
                date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000));
                const expires = "; expires=" + date.toUTCString();
                document.cookie = `${name}=${value}${expires}; path=/; SameSite=Lax; Secure`;
            },
            remove(name: string, options: any) {
                if (typeof document === 'undefined') return;
                document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax; Secure`;
            },
        },
    }
);
