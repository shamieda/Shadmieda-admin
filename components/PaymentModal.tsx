"use client";

import { useState, useRef } from "react";
import { X, Upload, CheckCircle, Loader2, Banknote, CreditCard, ChevronRight } from "lucide-react";
import { uploadStaffDocAction } from "@/app/actions/upload-doc";
import { paySalaryAction } from "@/app/actions/payroll";

interface PaymentModalProps {
    staff: any;
    month: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PaymentModal({ staff, month, onClose, onSuccess }: PaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Online Transfer">("Online Transfer");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleConfirmPayment = async () => {
        setLoading(true);
        try {
            let proofUrl = "";

            // 1. Upload receipt if file exists
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('fileName', `receipts/${staff.id}/${month}_${Date.now()}.${file.name.split('.').pop()}`);

                const uploadRes = await uploadStaffDocAction(formData);
                if (!uploadRes.success) throw new Error(uploadRes.error);
                proofUrl = uploadRes.path || "";
            }

            // 2. Record payment in DB
            const payRes = await paySalaryAction({
                userId: staff.id,
                month: month,
                basicSalary: staff.dailyRate * staff.daysWorked,
                totalPenalty: staff.penalty,
                totalBonus: staff.bonus,
                finalAmount: staff.earnedSalary,
                paymentMethod: paymentMethod,
                paymentProofUrl: proofUrl
            });

            if (!payRes.success) throw new Error(payRes.error);

            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.message || "Gagal memproses bayaran.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
                    <div>
                        <h3 className="text-xl font-bold text-white">Sahkan Bayaran Gaji</h3>
                        <p className="text-gray-400 text-sm">{staff.full_name} • {month}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Summary Card */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Jumlah Bayaran</p>
                            <p className="text-2xl font-black text-primary">RM {staff.earnedSalary.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                            <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full font-bold">Sedia Dibayar</span>
                        </div>
                    </div>

                    {/* Method Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kaedah Bayaran</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPaymentMethod("Online Transfer")}
                                className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${paymentMethod === "Online Transfer"
                                        ? "bg-primary/20 border-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                    }`}
                            >
                                <CreditCard className="w-5 h-5" />
                                <span className="font-bold">Transfer</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod("Cash")}
                                className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${paymentMethod === "Cash"
                                        ? "bg-primary/20 border-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                    }`}
                            >
                                <Banknote className="w-5 h-5" />
                                <span className="font-bold">Tunai</span>
                            </button>
                        </div>
                    </div>

                    {/* Receipt Upload */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bukti Bayaran (Resit/Gambar)</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`group relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-2 ${previewUrl ? "border-primary/50" : "border-white/10 hover:border-primary/30 hover:bg-white/5"
                                }`}
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-white font-bold text-sm">Tukar Gambar</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-3 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6 text-gray-500 group-hover:text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-gray-300">Klik untuk Muat Naik</p>
                                        <p className="text-[10px] text-gray-500">PNG, JPG atau PDF (Maks 5MB)</p>
                                    </div>
                                </>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*,.pdf"
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-black/40 border-t border-white/10 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleConfirmPayment}
                        disabled={loading || (!file && paymentMethod === "Online Transfer")}
                        className="flex-[2] py-3 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Sahkan Bayaran RM{staff.earnedSalary.toFixed(2)}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
