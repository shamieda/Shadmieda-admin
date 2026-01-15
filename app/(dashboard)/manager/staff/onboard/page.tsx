"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, FileText, CheckCircle, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";
import { onboardStaffAction } from "@/app/actions/onboard";
import { uploadStaffDocAction } from "@/app/actions/upload-doc";
import BankPicker from "@/components/BankPicker";

export default function OnboardingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [positions, setPositions] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        icNumber: "",
        phone: "",
        address: "",
        position: "",
        basicSalary: "50",
        startDate: new Date().toISOString().split('T')[0],
        bankName: "Maybank",
        bankAccount: "",
        icFrontUrl: "",
        icBackUrl: "",
        emergencyContacts: [
            { name: "", phone: "", relation: "" },
            { name: "", phone: "", relation: "" }
        ]
    });
    const [icFrontFile, setIcFrontFile] = useState<File | null>(null);
    const [icBackFile, setIcBackFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [kitItems, setKitItems] = useState<any[]>([]);
    const [selectedKitItems, setSelectedKitItems] = useState<string[]>([]);

    useEffect(() => {
        fetchPositions();
        fetchShopSettings();
    }, []);

    const fetchPositions = async () => {
        try {
            const { data, error } = await supabase
                .from('positions')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setPositions(data || []);
            if (data && data.length > 0) {
                setFormData(prev => ({ ...prev, position: data[0].name }));
            }
        } catch (error) {
            console.error('Error fetching positions:', error);
        }
    };

    const fetchShopSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('shop_settings')
                .select('onboarding_kit_config')
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (data?.onboarding_kit_config) {
                setKitItems(data.onboarding_kit_config);
                // Default select all items
                setSelectedKitItems(data.onboarding_kit_config.map((item: any) => item.id));
            }
        } catch (error) {
            console.error('Error fetching shop settings:', error);
        }
    };

    const handleKitToggle = (id: string) => {
        setSelectedKitItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEmergencyChange = (index: number, field: string, value: string) => {
        const updatedContacts = [...formData.emergencyContacts];
        updatedContacts[index] = { ...updatedContacts[index], [field]: value };
        setFormData({ ...formData, emergencyContacts: updatedContacts });
    };

    const generateOfferLetter = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("SHAMIEDA FAMILY ENTERPRISE", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No. 123, Jalan Contoh, 50000 Kuala Lumpur", 105, 26, { align: "center" });

        doc.line(20, 30, 190, 30);

        // Content
        doc.setFontSize(12);
        doc.text(`Tarikh: ${new Date().toLocaleDateString()}`, 20, 45);

        doc.text("KEPADA:", 20, 55);
        doc.setFont("helvetica", "bold");
        doc.text(formData.fullName.toUpperCase(), 20, 60);
        doc.setFont("helvetica", "normal");
        doc.text(formData.address, 20, 65);

        doc.setFont("helvetica", "bold");
        doc.text("TAWARAN PEKERJAAN SEBAGAI " + formData.position.toUpperCase(), 20, 85);

        doc.setFont("helvetica", "normal");
        const bodyText = `Sukacita dimaklumkan bahawa anda telah dipilih untuk menyertai pasukan Shamieda Family sebagai ${formData.position}.

Butiran tawaran adalah seperti berikut:

1. Gaji Harian: RM ${formData.basicSalary} / Hari
2. Tarikh Mula: ${formData.startDate}
3. Tempoh Percubaan: 3 Bulan

Anda tertakluk kepada polisi syarikat termasuk kehadiran, disiplin, dan etika kerja. Sila tandatangan di bawah jika anda menerima tawaran ini.`;

        doc.text(bodyText, 20, 95, { maxWidth: 170, lineHeightFactor: 1.5 });

        // Footer
        doc.text("Yang Benar,", 20, 180);
        doc.text("____________________", 20, 200);
        doc.setFont("helvetica", "bold");
        doc.text("PENGURUS", 20, 205);
        doc.text("Shamieda Family Enterprise", 20, 210);

        doc.text("Diterima Oleh,", 120, 180);
        doc.text("____________________", 120, 200);
        doc.text(formData.fullName, 120, 205);

        // Save
        doc.save(`Offer_Letter_${formData.fullName.replace(/\s+/g, '_')}.pdf`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Upload IC Images if they exist
            let icFrontUrl = "";
            let icBackUrl = "";

            if (icFrontFile || icBackFile) {
                setUploading(true);

                try {
                    if (icFrontFile) {
                        const fileExt = icFrontFile.name.split('.').pop();
                        const fileName = `${formData.icNumber}_front_${Math.random()}.${fileExt}`;

                        const uploadData = new FormData();
                        uploadData.append('file', icFrontFile);
                        uploadData.append('fileName', fileName);

                        const uploadResult = await uploadStaffDocAction(uploadData);
                        if (!uploadResult.success) throw new Error(uploadResult.error);
                        icFrontUrl = uploadResult.path || "";
                    }

                    if (icBackFile) {
                        const fileExt = icBackFile.name.split('.').pop();
                        const fileName = `${formData.icNumber}_back_${Math.random()}.${fileExt}`;

                        const uploadData = new FormData();
                        uploadData.append('file', icBackFile);
                        uploadData.append('fileName', fileName);

                        const uploadResult = await uploadStaffDocAction(uploadData);
                        if (!uploadResult.success) throw new Error(uploadResult.error);
                        icBackUrl = uploadResult.path || "";
                    }
                } catch (uploadError: any) {
                    throw new Error(`Muat Naik IC Gagal: ${uploadError.message}`);
                }
            }

            // 2. Filter full item objects based on selection
            const finalKit = kitItems.filter(item => selectedKitItems.includes(item.id));

            let result;
            try {
                result = await onboardStaffAction({
                    ...formData,
                    onboardingKit: finalKit,
                    icFrontUrl,
                    icBackUrl
                });
            } catch (dbError: any) {
                throw new Error(`Simpan Data Gagal: ${dbError.message}`);
            }

            if (!result.success) {
                throw new Error(`Simpan Data Gagal: ${result.error}`);
            }

            setSuccess(true);
            setTimeout(() => {
                router.push("/manager/staff");
            }, 2000);

        } catch (error: any) {
            console.error('Error onboarding staff:', error);
            if (error.message?.includes('Bucket not found')) {
                alert("Ralat: Bucket 'staff-docs' tidak dijumpai di Supabase Storage. Sila cipta bucket tersebut di dashboard Supabase anda terlebih dahulu.");
            } else {
                alert(error.message);
            }
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-green-400/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Pendaftaran Berjaya!</h2>
                <p className="text-gray-400">Data staff telah disimpan. Mengembalikan anda ke senarai staff...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/manager/staff" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">Onboarding Staff Baru</h1>
                    <p className="text-gray-400 text-sm">Isi maklumat lengkap untuk pendaftaran & surat tawaran.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-2 bg-surface border border-white/5 rounded-xl p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Maklumat Peribadi</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">Nama Penuh (Seperti IC)</label>
                                    <input required name="fullName" value={formData.fullName} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">Email (Untuk Login)</label>
                                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">Kata Laluan (Password)</label>
                                    <input required type="password" name="password" value={formData.password} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none" placeholder="Set kata laluan staff" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">No. Kad Pengenalan</label>
                                    <input required name="icNumber" value={formData.icNumber} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">No. Telefon</label>
                                    <input required name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-medium text-gray-400">Alamat</label>
                                    <textarea required name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none resize-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">Gambar IC Depan</label>
                                    <input type="file" accept="image/*" onChange={(e) => setIcFrontFile(e.target.files?.[0] || null)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary outline-none file:bg-white/10 file:border-0 file:text-white file:rounded file:px-2 file:py-1 file:mr-2 file:hover:bg-white/20 file:cursor-pointer" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">Gambar IC Belakang</label>
                                    <input type="file" accept="image/*" onChange={(e) => setIcBackFile(e.target.files?.[0] || null)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-primary outline-none file:bg-white/10 file:border-0 file:text-white file:rounded file:px-2 file:py-1 file:mr-2 file:hover:bg-white/20 file:cursor-pointer" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Maklumat Kecemasan (Waris)</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[0, 1].map((index) => (
                                    <div key={index} className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
                                        <p className="text-xs font-bold text-primary uppercase tracking-wider">Waris {index + 1}</p>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400">Nama Penuh</label>
                                            <input
                                                required
                                                value={formData.emergencyContacts[index].name}
                                                onChange={(e) => handleEmergencyChange(index, 'name', e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none"
                                                placeholder="Nama waris"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-400">No. Telefon</label>
                                                <input
                                                    required
                                                    value={formData.emergencyContacts[index].phone}
                                                    onChange={(e) => handleEmergencyChange(index, 'phone', e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none"
                                                    placeholder="0123456789"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-400">Hubungan</label>
                                                <select
                                                    required
                                                    value={formData.emergencyContacts[index].relation}
                                                    onChange={(e) => handleEmergencyChange(index, 'relation', e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none"
                                                >
                                                    <option value="">Pilih Hubungan</option>
                                                    <option value="Ayah">Ayah</option>
                                                    <option value="Ibu">Ibu</option>
                                                    <option value="Pasangan">Pasangan</option>
                                                    <option value="Adik Beradik">Adik Beradik</option>
                                                    <option value="Penjaga">Penjaga</option>
                                                    <option value="Lain-lain">Lain-lain</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Maklumat Pekerjaan</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 uppercase font-bold">Stesen / Posisi</label>
                                    <select
                                        name="position"
                                        value={formData.position}
                                        onChange={handleChange}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary capitalize"
                                    >
                                        {positions.map(p => (
                                            <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">Gaji Harian (RM)</label>
                                    <input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">Tarikh Mula</label>
                                    <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2 flex items-center gap-2">
                                <Package className="w-5 h-5 text-purple-400" />
                                Onboarding Kit
                            </h3>
                            <p className="text-xs text-gray-400">Barang yang dipilih akan ditolak kosnya daripada gaji bulan pertama.</p>

                            <div className="space-y-3">
                                {kitItems.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">Tiada konfigurasi kit. Sila set di Tetapan.</p>
                                ) : (
                                    kitItems.map((item) => (
                                        <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedKitItems.includes(item.id) ? 'bg-purple-500/10 border-purple-500/50' : 'bg-black/20 border-white/5 hover:bg-white/5'}`} onClick={() => handleKitToggle(item.id)}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedKitItems.includes(item.id) ? 'bg-purple-500 border-purple-500' : 'border-gray-500'}`}>
                                                    {selectedKitItems.includes(item.id) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <span className="text-sm font-medium text-white">{item.name}</span>
                                            </div>
                                            <span className="text-sm font-bold text-gray-400">RM {parseFloat(item.price).toFixed(2)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            {selectedKitItems.length > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                    <span className="text-sm font-bold text-white">Jumlah Potongan Gaji:</span>
                                    <span className="text-sm font-bold text-purple-400">
                                        RM {kitItems.filter(i => selectedKitItems.includes(i.id)).reduce((sum, i) => sum + parseFloat(i.price), 0).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Maklumat Bank</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <BankPicker
                                        label="Nama Bank"
                                        value={formData.bankName}
                                        onChange={(val) => setFormData({ ...formData, bankName: val })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-400">No. Akaun</label>
                                    <input required name="bankAccount" value={formData.bankAccount} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-primary text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Simpan Data Staff
                            </button>
                        </div>
                    </form>
                </div>

                {/* Preview / Actions */}
                <div className="space-y-6">
                    <div className="bg-surface border border-white/5 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Dokumen</h3>
                        <p className="text-gray-400 text-sm mb-6">Jana surat tawaran rasmi secara automatik berdasarkan data yang diisi.</p>

                        <button
                            onClick={generateOfferLetter}
                            disabled={!formData.fullName || !formData.address}
                            className="w-full bg-white/5 border border-white/10 text-white font-medium py-3 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileText className="w-5 h-5" />
                            Download Offer Letter
                        </button>
                    </div>

                    <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-6">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
                            <div>
                                <h4 className="font-bold text-green-400 mb-1">Checklist HR</h4>
                                <ul className="text-sm text-gray-400 space-y-2 list-disc pl-4">
                                    <li>Semak IC Original</li>
                                    <li>Ambil Gambar Profil</li>
                                    <li>Setup Fingerprint/Face ID</li>
                                    <li>Add ke WhatsApp Group</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
