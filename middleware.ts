import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
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
