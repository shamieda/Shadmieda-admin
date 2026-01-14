"use client";

import { useState, useRef } from "react";
import { User, Phone, CreditCard, Save, MapPin, Camera } from "lucide-react";

export default function StaffProfilePage() {
    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        fullName: "Ali Bin Abu",
        phone: "012-3456789",
        address: "No 12, Jalan Kebun, Shah Alam",
        bankName: "Maybank",
        bankAccount: "162345678901",
        icNumber: "900101-10-1234"
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert("Profil berjaya dikemaskini!");
        setLoading(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <div
                    onClick={handleAvatarClick}
                    className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-black text-3xl font-bold relative group cursor-pointer overflow-hidden"
                >
                    {avatar ? (
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        formData.fullName.charAt(0)
                    )}

                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Profil Saya</h1>
                    <p className="text-gray-400 text-sm">Kemaskini maklumat peribadi anda.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="bg-surface border border-white/5 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-primary" />
                        Maklumat Peribadi
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold">Nama Penuh</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold">No. Kad Pengenalan</label>
                            <input
                                type="text"
                                name="icNumber"
                                value={formData.icNumber}
                                disabled
                                className="w-full bg-black/30 border border-white/5 rounded-lg py-3 px-4 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold">No. Telefon</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold">Alamat</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bank Info */}
                <div className="bg-surface border border-white/5 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <CreditCard className="w-5 h-5 text-green-400" />
                        Maklumat Bank
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold">Nama Bank</label>
                            <input
                                type="text"
                                name="bankName"
                                value={formData.bankName}
                                onChange={handleChange}
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold">No. Akaun</label>
                            <input
                                type="text"
                                name="bankAccount"
                                value={formData.bankAccount}
                                onChange={handleChange}
                                className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary transition-all"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? "Menyimpan..." : (
                        <>
                            <Save className="w-5 h-5" />
                            SIMPAN PERUBAHAN
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
