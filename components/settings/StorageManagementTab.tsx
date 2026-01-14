import { Trash2 } from "lucide-react";

interface StorageManagementTabProps {
    loading: boolean;
    onCleanup: () => void;
    onResetData: () => void;
}

export default function StorageManagementTab({ loading, onCleanup, onResetData }: StorageManagementTabProps) {
    return (
        <div className="space-y-8">
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Pengurusan Storage</h3>
                <p className="text-gray-400 text-sm mb-6">
                    Urus penggunaan ruang simpanan dengan memadam gambar selfie lama.
                </p>

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Pembersihan Storage
                        </h4>
                        <p className="text-gray-400 text-sm max-w-md">
                            Padam semua gambar selfie kehadiran yang berusia lebih dari <strong>3 hari</strong>.
                            Rekod kehadiran akan kekal, tetapi gambar akan dipadam untuk menjimatkan ruang.
                        </p>
                    </div>
                    <button
                        onClick={onCleanup}
                        disabled={loading}
                        className="bg-red-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Sedang Memproses..." : "BERSIHKAN STORAGE"}
                    </button>
                </div>
            </div>

            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Pengurusan Data</h3>
                <p className="text-gray-400 text-sm mb-6">
                    Tetapkan semula sistem untuk persediaan mod produksi.
                </p>

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Clean Slate Reset
                        </h4>
                        <p className="text-gray-400 text-sm max-w-md">
                            <strong>AMARAN SENSITIF!</strong> Padam SEMUA data testing (Attendance, Leaves, Tasks, Advances, Payroll, Notifications).
                            Hanya gunakan butang ini sebelum anda mula menggunakan sistem secara rasmi.
                        </p>
                    </div>
                    <button
                        onClick={onResetData}
                        disabled={loading}
                        className="bg-red-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Sedang Memproses..." : "RESET DATA TESTING"}
                    </button>
                </div>
            </div>
        </div>
    );
}
