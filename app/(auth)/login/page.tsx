"use client";

import { useState } from "react";
import { Lock, User, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Authenticate with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (authData.user && authData.session) {
                // 1.5 Persist session for recovery
                try {
                    const { persistSessionAction } = await import("@/app/actions/auth");
                    await persistSessionAction(authData.user.id, authData.session.refresh_token);
                } catch (persistErr) {
                    console.error("Failed to set persistent session:", persistErr);
                }

                // 2. Check User Role
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('auth_id', authData.user.id)
                    .single();

                if (userError) {
                    console.error("Profile fetch error:", userError);
                }

                const role = userData?.role || 'staff';

                // 3. Redirect based on Role
                if (role === 'admin' || role === 'master' || role === 'manager') {
                    router.push('/manager');
                } else {
                    router.push('/staff/attendance');
                }
            }
        } catch (err: any) {
            setError(err.message || "Log masuk gagal. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8 flex flex-col items-center">
                    <img src="/logo.png" alt="Shamieda Logo" className="w-48 mb-4 drop-shadow-lg" />
                    <h1 className="text-xl font-bold text-white mb-1">SHAMIEDA FAMILY</h1>
                    <p className="text-gray-400 text-sm">Sistem Pengurusan Operasi & HR</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Email Pengguna</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nama@shamieda.com"
                                required
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Kata Laluan</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            "LOG MASUK"
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-600">
                    Powered by <span className="text-primary font-semibold">Ninjadev</span>
                </div>
            </div>
        </div>
    );
}
