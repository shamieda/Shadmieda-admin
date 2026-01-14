import { useState } from "react";
import { Lock, Mail, Save, AlertCircle } from "lucide-react";

interface AccountSettingsTabProps {
    loading: boolean;
    userEmail?: string;
    onUpdateEmail: (email: string) => Promise<void>;
    onUpdatePassword: (password: string) => Promise<void>;
}

export default function AccountSettingsTab({
    loading,
    userEmail,
    onUpdateEmail,
    onUpdatePassword
}: AccountSettingsTabProps) {
    const [email, setEmail] = useState(userEmail || "");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email && email !== userEmail) {
            onUpdateEmail(email);
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");

        if (password.length < 6) {
            setPasswordError("Kata laluan mesti sekurang-kurangnya 6 aksara.");
            return;
        }

        if (password !== confirmPassword) {
            setPasswordError("Kata laluan tidak sepadan.");
            return;
        }

        onUpdatePassword(password);
        setPassword("");
        setConfirmPassword("");
    };

    return (
        <div className="space-y-8">
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Tetapan Emel</h3>
                        <p className="text-sm text-gray-400">Kemaskini alamat emel akaun anda.</p>
                    </div>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">Emel Baru</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                            placeholder="nama@contoh.com"
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || email === userEmail}
                        className="bg-white/10 text-white font-bold px-6 py-2 rounded-lg hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
                    >
                        <Save className="w-4 h-4" />
                        Simpan Emel
                    </button>
                    <p className="text-xs text-yellow-500/80 flex items-center gap-1.5 mt-2">
                        <AlertCircle className="w-3 h-3" />
                        Anda mungkin perlu mengesahkan emel baru sebelum perubahan berlaku.
                    </p>
                </form>
            </div>

            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Tukar Kata Laluan</h3>
                        <p className="text-sm text-gray-400">Pastikan akaun anda selamat dengan kata laluan yang kukuh.</p>
                    </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Kata Laluan Baru</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Sahkan Kata Laluan</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary disabled:opacity-50"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {passwordError && (
                        <p className="text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {passwordError}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !password || !confirmPassword}
                        className="bg-white/10 text-white font-bold px-6 py-2 rounded-lg hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
                    >
                        <Save className="w-4 h-4" />
                        Tukar Kata Laluan
                    </button>
                </form>
            </div>
        </div>
    );
}
