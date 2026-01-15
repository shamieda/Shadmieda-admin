"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch role to redirect correctly
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single();

        const role = profile?.role || 'staff';
        if (role === 'admin' || role === 'master' || role === 'manager') {
          router.replace('/manager');
        } else {
          router.replace('/staff/attendance');
        }
      }
    };
    checkUser();
  }, [router]);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary rounded-full blur-[120px]" />
      </div>

      <div className="z-10 max-w-2xl">
        <div className="inline-block px-3 py-1 mb-6 border border-primary/30 rounded-full bg-primary/10">
          <span className="text-primary text-xs font-bold tracking-wider uppercase">System v1.0 Live</span>
        </div>

        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Shamieda Logo" className="w-64 md:w-80 drop-shadow-2xl" />
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
          SHAMIEDA <span className="text-primary">FAMILY</span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-lg mx-auto">
          Sistem Pengurusan Berpusat untuk Operasi F&B, HR, dan Kehadiran Staff.
        </p>

        <Link
          href="/login"
          className="group inline-flex items-center gap-3 bg-primary text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-lg shadow-yellow-500/25"
        >
          Masuk Sistem
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <footer className="absolute bottom-6 text-gray-600 text-sm z-10">
        &copy; {new Date().getFullYear()} Shamieda Family. Powered by Ninjadev.
      </footer>
    </main>
  );
}
