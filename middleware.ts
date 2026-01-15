import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { recoverSessionForMiddleware, SESSION_COOKIE_NAME } from './lib/session-recovery';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    const mergedOptions = {
                        ...options,
                        maxAge: options.maxAge ?? 60 * 60 * 24 * 30, // 30 days if not specified
                        path: options.path ?? '/',
                        secure: true,
                        sameSite: 'lax' as const,
                    };

                    // Update request cookies for the current middleware run
                    request.cookies.set({ name, value, ...mergedOptions });

                    // Update response cookies to pass to the user
                    response.cookies.set({ name, value, ...mergedOptions });
                },
                remove(name: string, options: CookieOptions) {
                    const mergedOptions = {
                        ...options,
                        maxAge: 0,
                        path: options.path ?? '/',
                        secure: true,
                        sameSite: 'lax' as const,
                    };

                    // Update request cookies
                    request.cookies.set({ name, value: '', ...mergedOptions });

                    // Update response cookies
                    response.cookies.set({ name, value: '', ...mergedOptions });
                },
            },
        }
    );

    let { data: { user }, error } = await supabase.auth.getUser();

    // 1.5 If NO user found in cookies, try RECOVERY from DB
    if (!user) {
        const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (sessionId) {
            console.log("MW: Attempting DB Recovery for SID:", sessionId);
            try {
                const recoveredSession = await recoverSessionForMiddleware(supabase, sessionId);
                if (recoveredSession && recoveredSession.user) {
                    user = recoveredSession.user;
                    console.log("MW: Recovery Successful for User:", recoveredSession.user.id);
                }
            } catch (recoveryErr) {
                console.error("MW: Recovery Error:", recoveryErr);
            }
        }
    }

    console.log("MW: Path:", request.nextUrl.pathname, "User:", user?.id, "Error:", error?.message);

    // 1. Protect routes
    if (request.nextUrl.pathname.startsWith('/manager') || request.nextUrl.pathname.startsWith('/staff')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // 2. Role-based Access Control
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('auth_id', user.id)
            .single();

        if (profile) {
            const role = profile.role;

            // Staff trying to access Manager pages
            if (role === 'staff' && request.nextUrl.pathname.startsWith('/manager')) {
                return NextResponse.redirect(new URL('/staff', request.url));
            }

            // Manager trying to access Admin pages (if any, future proofing)
            // For now, Manager can access /manager. 
            // If we had /admin, we would block Manager here.
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
