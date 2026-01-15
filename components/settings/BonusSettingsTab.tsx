import { Calendar, CheckSquare, Trophy, Save, Loader2 } from "lucide-react";
import { ShopSettings } from "@/types/settings";

interface BonusSettingsTabProps {
    settings: ShopSettings;
    loading: boolean;
    onSettingsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSaveSettings: (e: React.FormEvent) => void;
}

export default function BonusSettingsTab({
    settings,
    loading,
    onSettingsChange,
    onSaveSettings
}: BonusSettingsTabProps) {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white">Konfigurasi Bonus & Gamifikasi</h3>
                    <p className="text-gray-400 text-sm">Tetapkan ganjaran automatik dan penalti untuk staff.</p>
                </div>
            </div>

            {/* The 3-Card Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Card 1: Attendance */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Calendar className="w-24 h-24 text-white" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Calendar className="w-6 h-6 text-blue-400" />
                        </div>
                        <h4 className="font-bold text-white">Bonus Kehadiran</h4>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Ganjaran (RM)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">RM</span>
                                <input
                                    type="number"
                                    name="attendance_bonus"
                                    value={settings.attendance_bonus}
                                    onChange={onSettingsChange}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white font-bold focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Diberikan automatik jika:
                            <br />• 0 Kelewatan
                            <br />• 0 Ponteng (Kecuali Isnin)
                        </p>
                    </div>
                </div>

                {/* Card 2: Task Incentives */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CheckSquare className="w-24 h-24 text-white" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-3 bg-red-500/20 rounded-lg">
                            <CheckSquare className="w-6 h-6 text-red-400" />
                        </div>
                        <h4 className="font-bold text-white">Penalti Tugasan</h4>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Denda Gagal (RM) / Tugas</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">RM</span>
                                <input
                                    type="number"
                                    name="task_penalty_amount"
                                    value={settings.task_penalty_amount}
                                    onChange={onSettingsChange}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white font-bold focus:border-red-500 outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Staff didenda automatik jika gagal menyiapkan tugasan harian sebelum waktu kedai tutup.
                        </p>
                    </div>
                </div>

                {/* Card 3: Ranking Rewards */}
                <div className="bg-black/30 border border-white/5 rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Trophy className="w-24 h-24 text-white" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-3 bg-yellow-500/20 rounded-lg">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                        </div>
                        <h4 className="font-bold text-white">Top 3 Ranking</h4>
                    </div>

                    <div className="space-y-3 relative z-10">
                        <div className="grid grid-cols-2 gap-2 items-center">
                            <label className="text-xs text-yellow-400 font-bold">Top 1 🥇</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">RM</span>
                                <input
                                    type="number"
                                    name="ranking_reward_1"
                                    value={settings.ranking_reward_1}
                                    onChange={onSettingsChange}
                                    className="w-full bg-black/50 border border-white/10 rounded text-sm pl-7 px-2 py-2 text-white focus:border-yellow-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-center">
                            <label className="text-xs text-gray-300 font-bold">Top 2 🥈</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">RM</span>
                                <input
                                    type="number"
                                    name="ranking_reward_2"
                                    value={settings.ranking_reward_2}
                                    onChange={onSettingsChange}
                                    className="w-full bg-black/50 border border-white/10 rounded text-sm pl-7 px-2 py-2 text-white focus:border-gray-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-center">
                            <label className="text-xs text-orange-400 font-bold">Top 3 🥉</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">RM</span>
                                <input
                                    type="number"
                                    name="ranking_reward_3"
                                    value={settings.ranking_reward_3}
                                    onChange={onSettingsChange}
                                    className="w-full bg-black/50 border border-white/10 rounded text-sm pl-7 px-2 py-2 text-white focus:border-orange-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6">
                <button
                    onClick={onSaveSettings}
                    disabled={loading}
                    className="bg-primary text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? "Menyimpan..." : (
                        <>
                            <Save className="w-5 h-5" />
                            SIMPAN TETAPAN
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
