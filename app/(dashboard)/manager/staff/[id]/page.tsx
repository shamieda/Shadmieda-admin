"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, User, Phone, CreditCard, Calendar, MapPin, Mail, Edit3, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function StaffProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditingSalary, setIsEditingSalary] = useState(false);
    const [tempSalary, setTempSalary] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchStaffDetails(params.id as string);
        }
    }, [params.id]);

    const fetchStaffDetails = async (id: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setStaff(data);
            setTempSalary(data.base_salary?.toString() || "0");
        } catch (error) {
            console.error('Error fetching staff details:', error);
            alert("Gagal memuatkan maklumat staff.");
            router.push('/manager/staff');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSalary = async () => {
        if (!staff || updating) return;
        setUpdating(true);

        try {
            const { error } = await supabase
                .from('users')
                .update({ base_salary: parseFloat(tempSalary) })
                .eq('id', staff.id);

            if (error) throw error;

            setStaff({ ...staff, base_salary: parseFloat(tempSalary) });
            setIsEditingSalary(false);
        } catch (error: any) {
            console.error('Error updating salary:', error);
            alert("Gagal mengemaskini gaji: " + error.message);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Memuatkan profil...</p>
            </div>
        );
    }

    if (!staff) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Kembali
            </button>

            <div className="bg-surface border border-white/5 rounded-2xl p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar */}
                    <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary shrink-0 overflow-hidden">
                        {staff.avatar_url ? (
                            <img src={staff.avatar_url} alt={staff.full_name} className="w-full h-full object-cover" />
                        ) : (
                            staff.full_name?.substring(0, 2).toUpperCase() || "US"
                        )}
                    </div>

                    <div className="flex-1 space-y-6 w-full">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{staff.full_name}</h1>
                            <div className="flex flex-wrap gap-3">
                                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold capitalize">
                                    Stesen: {staff.position || 'Staff'}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-sm capitalize">
                                    {staff.employment_type || 'Full-Time'}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-sm capitalize ${staff.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {staff.status || 'Active'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                            <div className="space-y-4">
                                <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider">Maklumat Peribadi</h3>

                                <div className="flex items-center gap-3 text-gray-300">
                                    <User className="w-5 h-5 text-gray-500" />
                                    <div>
                                        <p className="text-xs text-gray-500">No. Kad Pengenalan</p>
                                        <p>{staff.ic_number || '-'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-gray-300">
                                    <Phone className="w-5 h-5 text-gray-500" />
                                    <div>
                                        <p className="text-xs text-gray-500">No. Telefon</p>
                                        <p>{staff.phone || '-'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-gray-300">
                                    <Mail className="w-5 h-5 text-gray-500" />
                                    <div>
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p>{staff.email || '-'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-gray-300">
                                    <MapPin className="w-5 h-5 text-gray-500" />
                                    <div>
                                        <p className="text-xs text-gray-500">Alamat</p>
                                        <p className="text-sm">{staff.address || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider">Maklumat Pekerjaan</h3>

                                <div className="flex items-center gap-3 text-gray-300">
                                    <CreditCard className="w-5 h-5 text-gray-500" />
                                    <div>
                                        <p className="text-xs text-gray-500">Bank & No. Akaun</p>
                                        <p>{staff.bank_name || '-'} • {staff.bank_account || '-'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-gray-300">
                                    <Calendar className="w-5 h-5 text-gray-500" />
                                    <div>
                                        <p className="text-xs text-gray-500">Tarikh Mula Kerja</p>
                                        <p>{staff.start_date ? new Date(staff.start_date).toLocaleDateString() : '-'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-gray-300">
                                    <div className="w-5 h-5 flex items-center justify-center text-gray-500 font-bold text-xs border border-gray-500 rounded">RM</div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500">Gaji Harian</p>
                                        {isEditingSalary ? (
                                            <div className="flex items-center gap-2 mt-2 group/edit">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold text-xs">RM</span>
                                                    <input
                                                        type="number"
                                                        value={tempSalary}
                                                        onChange={(e) => setTempSalary(e.target.value)}
                                                        className="w-28 bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-white text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-bold"
                                                        disabled={updating}
                                                        autoFocus
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleUpdateSalary}
                                                    disabled={updating}
                                                    className="p-2 bg-primary text-black rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-all shadow-lg shadow-yellow-500/10 active:scale-95"
                                                    title="Simpan"
                                                >
                                                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsEditingSalary(false);
                                                        setTempSalary(staff.base_salary?.toString() || "0");
                                                    }}
                                                    disabled={updating}
                                                    className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                                    title="Batal"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className="flex items-center gap-2 mt-1 group cursor-pointer"
                                                onClick={() => setIsEditingSalary(true)}
                                            >
                                                <p className="text-lg font-bold text-white tracking-tight">
                                                    RM {staff.base_salary || '0'} <span className="text-xs text-gray-500 font-normal">/ Hari</span>
                                                </p>
                                                <div className="p-1.5 rounded-full bg-white/0 group-hover:bg-white/5 transition-colors">
                                                    <Edit3 className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contacts */}
                        <div className="pt-6 border-t border-white/5">
                            <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-4">Maklumat Kecemasan (Waris)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {staff.emergency_contacts && Array.isArray(staff.emergency_contacts) && staff.emergency_contacts.length > 0 ? (
                                    staff.emergency_contacts.map((contact: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-2">
                                            <p className="text-xs font-bold text-primary uppercase tracking-wider">Waris {idx + 1}</p>
                                            <p className="text-white font-bold">{contact.name || '-'}</p>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">{contact.relation || 'Hubungan'}</span>
                                                <span className="text-gray-300">{contact.phone || '-'}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Tiada maklumat waris.</p>
                                )}
                            </div>
                        </div>

                        {/* IC Documents */}
                        <div className="pt-6 border-t border-white/5">
                            <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-4">Dokumen IC</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500">IC Depan</p>
                                    {staff.ic_front_url ? (
                                        <div className="relative aspect-[1.6/1] rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/staff-docs/${staff.ic_front_url}`}
                                                alt="IC Depan"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="aspect-[1.6/1] rounded-lg border border-dashed border-white/10 flex items-center justify-center text-gray-600 text-sm">
                                            Tiada Gambar
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500">IC Belakang</p>
                                    {staff.ic_back_url ? (
                                        <div className="relative aspect-[1.6/1] rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/staff-docs/${staff.ic_back_url}`}
                                                alt="IC Belakang"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="aspect-[1.6/1] rounded-lg border border-dashed border-white/10 flex items-center justify-center text-gray-600 text-sm">
                                            Tiada Gambar
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
