import { Bell, Save } from "lucide-react";

interface NotificationsTabProps {
    onSave: () => void;
}

export default function NotificationsTab({ onSave }: NotificationsTabProps) {
    return (
        <div className="space-y-8">
            {/* Admin Notification Settings */}
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Tetapan Notifikasi Admin
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                    Pilih jenis notifikasi yang admin akan terima.
                </p>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                            <p className="text-white font-bold">Kehadiran Staff</p>
                            <p className="text-xs text-gray-400">Terima notifikasi apabila staff clock in/out</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                            <p className="text-white font-bold">Permohonan Baru</p>
                            <p className="text-xs text-gray-400">Terima notifikasi untuk permohonan cuti/advance</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                            <p className="text-white font-bold">Tugasan Selesai</p>
                            <p className="text-xs text-gray-400">Terima notifikasi apabila staff selesaikan tugasan</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Staff Notification Settings */}
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Tetapan Notifikasi Staff
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                    Pilih jenis notifikasi yang staff akan terima.
                </p>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                            <p className="text-white font-bold">Tugasan Baru</p>
                            <p className="text-xs text-gray-400">Hantar notifikasi apabila tugasan baru diberikan</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                            <p className="text-white font-bold">Status Permohonan</p>
                            <p className="text-xs text-gray-400">Hantar notifikasi untuk status cuti/advance</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                            <p className="text-white font-bold">Peringatan Gaji</p>
                            <p className="text-xs text-gray-400">Hantar notifikasi slip gaji setiap bulan</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={onSave}
                    className="bg-primary text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-all flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    SIMPAN TETAPAN
                </button>
            </div>
        </div>
    );
}
