import { Lock, CreditCard, Phone } from "lucide-react";

export default function LockedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <div className="w-full max-w-lg bg-surface border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl shadow-red-900/20">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-10 h-10 text-red-500" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">SISTEM DIGANTUNG</h1>
                <p className="text-gray-400 mb-8">
                    Maaf, akses ke sistem <span className="text-primary font-bold">Shamieda Family</span> telah disekat sementara kerana isu langganan tertunggak.
                </p>

                <div className="bg-white/5 rounded-xl p-6 mb-8 text-left space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <span className="text-gray-400">Status Akaun</span>
                        <span className="text-red-400 font-bold bg-red-400/10 px-3 py-1 rounded-full text-xs">LOCKED</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Jumlah Tertunggak</span>
                        <span className="text-white font-bold text-xl">RM 300.00</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        BAYAR SEKARANG
                    </button>

                    <button className="w-full bg-white/5 text-white font-bold py-4 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                        <Phone className="w-5 h-5" />
                        Hubungi Ninjadev Support
                    </button>
                </div>

                <p className="mt-8 text-xs text-gray-600">
                    ID Rujukan: <span className="font-mono">SHAMIEDA-LOCK-001</span>
                </p>
            </div>
        </div>
    );
}
