"use client";

import { useState, useEffect } from "react";
import { User, Phone, CreditCard, Landmark, Save, ShieldCheck, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadAvatarAction } from "@/app/actions/upload-avatar";

export default function StaffSettingsPage() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [profile, setProfile] = useState({
        full_name: "",
        phone: "",
        ic_number: "",
        bank_name: "",
        bank_account: "",
        email: "",
        password: "",
        avatar_url: "",
        id: "",
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setFetching(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('auth_id', user.id)
                    .single();

                if (error) throw error;
                if (data) {
                    setProfile({
                        full_name: data.full_name || "",
                        phone: data.phone || "",
                        ic_number: data.ic_number || "",
                        bank_name: data.bank_name || "",
                        bank_account: data.bank_account || "",
                        email: user.email || "",
                        password: "",
                        avatar_url: data.avatar_url || "",
                        id: data.id || "",
                    });
                }
            }
        } catch (error: any) {
            console.error("Error fetching profile:", error);
            setMessage({ type: 'error', text: "Gagal memuatkan maklumat profil." });
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Sesi tamat. Sila log masuk semula.");

            // 1. Update Profile in 'users' table
            const { error: profileError } = await supabase
                .from('users')
                .update({
                    full_name: profile.full_name,
                    phone: profile.phone,
                    ic_number: profile.ic_number,
                    bank_name: profile.bank_name,
                    bank_account: profile.bank_account,
                })
                .eq('auth_id', user.id);

            if (profileError) throw profileError;

            // 2. Update Auth Data (Password only)
            const updateData: any = {};
            if (profile.password) updateData.password = profile.password;

            if (Object.keys(updateData).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(updateData);
                if (authError) throw authError;
                setMessage({ type: 'success', text: "Maklumat profil dan kata laluan berjaya dikemaskini!" });
            } else {
                setMessage({ type: 'success', text: "Maklumat profil berjaya dikemaskini!" });
            }

            // Clear password field after success
            setProfile(prev => ({ ...prev, password: "" }));

        } catch (error: any) {
            console.error("Error updating profile:", error);
            setMessage({ type: 'error', text: error.message || "Gagal mengemaskini maklumat." });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert("Sila pilih fail gambar sahaja.");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert("Saiz gambar terlalu besar. Maksimum 2MB.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', profile.id);

            const result = await uploadAvatarAction(formData);

            if (result.success && result.url) {
                setProfile(prev => ({ ...prev, avatar_url: result.url! }));
                setMessage({ type: 'success', text: "Gambar profil berjaya dimuat naik!" });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Avatar upload error:", error);
            alert(`Gagal memuat naik gambar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Tetapan Profil</h1>
                <p className="text-gray-400 text-sm">Kemaskini maklumat peribadi, perbankan, dan kata laluan akaun anda.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {message && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
                        }`}>
                        {message.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                        {message.text}
                    </div>
                )}

                {/* Avatar Section */}
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-4 border-surface overflow-hidden bg-black/40 flex items-center justify-center shadow-xl">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User className="w-16 h-16 text-gray-600" />
                            )}
                            {loading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-2 bg-primary text-black rounded-full cursor-pointer hover:bg-yellow-400 transition-all shadow-lg group-hover:scale-110">
                            <Camera className="w-5 h-5" />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                                disabled={loading}
                            />
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">Klik ikon kamera untuk tukar gambar profil</p>
                </div>

                {/* Maklumat Asas */}
                <div className="bg-surface border border-white/5 rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                        <User className="w-5 h-5" />
                        <h2 className="font-bold uppercase tracking-wider text-xs">Maklumat Asas</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 ml-1">Nama Penuh</label>
                            <input
                                type="text"
                                name="full_name"
                                value={profile.full_name}
                                onChange={handleChange}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary outline-none transition-all"
                                placeholder="Contoh: Ahmad Bin Ali"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 ml-1">Nombor Telefon</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    name="phone"
                                    value={profile.phone}
                                    onChange={handleChange}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-primary outline-none transition-all font-mono"
                                    placeholder="0123456789"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs text-gray-400 ml-1">Nombor IC</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    name="ic_number"
                                    value={profile.ic_number}
                                    onChange={handleChange}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-primary outline-none transition-all font-mono"
                                    placeholder="900101015566"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Keselamatan Akaun */}
                <div className="bg-surface border border-white/5 rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                        <ShieldCheck className="w-5 h-5" />
                        <h2 className="font-bold uppercase tracking-wider text-xs">Keselamatan Akaun (Login)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 ml-1">E-mel (ID Login)</label>
                            <input
                                type="email"
                                name="email"
                                value={profile.email}
                                readOnly
                                className="w-full bg-black/40 border border-white/5 rounded-lg px-4 py-2.5 text-gray-500 cursor-not-allowed outline-none transition-all"
                                placeholder="staff@example.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 ml-1">Kata Laluan Baru</label>
                            <input
                                type="password"
                                name="password"
                                value={profile.password}
                                onChange={handleChange}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary outline-none transition-all"
                                placeholder="Tinggalkan kosong jika tidak mahu tukar"
                                minLength={6}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">* E-mel adalah tetap dan hanya boleh ditukar oleh Pengurus.</p>
                </div>

                {/* Maklumat Perbankan */}
                <div className="bg-surface border border-white/5 rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                        <Landmark className="w-5 h-5" />
                        <h2 className="font-bold uppercase tracking-wider text-xs">Maklumat Perbankan</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 ml-1">Nama Bank</label>
                            <select
                                name="bank_name"
                                value={profile.bank_name}
                                onChange={handleChange}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary outline-none transition-all"
                            >
                                <option value="" className="bg-surface">Pilih Bank</option>
                                <option value="Maybank" className="bg-surface">Maybank</option>
                                <option value="CIMB" className="bg-surface">CIMB Bank</option>
                                <option value="Public Bank" className="bg-surface">Public Bank</option>
                                <option value="RHB" className="bg-surface">RHB Bank</option>
                                <option value="Hong Leong" className="bg-surface">Hong Leong Bank</option>
                                <option value="AmBank" className="bg-surface">AmBank</option>
                                <option value="UOB" className="bg-surface">UOB Bank</option>
                                <option value="Bank Islam" className="bg-surface">Bank Islam</option>
                                <option value="Bank Rakyat" className="bg-surface">Bank Rakyat</option>
                                <option value="BSN" className="bg-surface">BSN</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-gray-400 ml-1">Nombor Akaun</label>
                            <input
                                type="text"
                                name="bank_account"
                                value={profile.bank_account}
                                onChange={handleChange}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary outline-none transition-all font-mono"
                                placeholder="123456789012"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary text-black font-bold px-8 py-3 rounded-lg hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-lg shadow-yellow-500/20 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        SIMPAN PERUBAHAN
                    </button>
                </div>
            </form>
        </div>
    );
}
