"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, User, Phone, CreditCard, Calendar, MapPin, Mail, Edit3, Check, X, Maximize2, Eye, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import BankPicker from "@/components/BankPicker";
import { uploadStaffDocAction } from "@/app/actions/upload-doc";

const FullScreenModal = ({ url, onClose }: { url: string; onClose: () => void }) => (
    <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
        onClick={onClose}
    >
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
        <div className="relative w-full h-full flex items-center justify-center max-w-5xl mx-auto" onClick={e => e.stopPropagation()}>
            <button
                onClick={onClose}
                className="absolute -top-12 right-0 p-3 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10"
            >
                <X className="w-6 h-6" />
            </button>
            <img
                src={url}
                alt="IC Full View"
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300"
            />
        </div>
    </div>
);

export default function StaffProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Universal Editing State
    const [editingField, setEditingField] = useState<string | null>(null);
    const [tempValues, setTempValues] = useState<any>({});

    // Lightbox State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

            // Initialize all temp values
            setTempValues({
                full_name: data.full_name || "",
                ic_number: data.ic_number || "",
                phone: data.phone || "",
                email: data.email || "",
                address: data.address || "",
                bank_name: data.bank_name || "",
                bank_account: data.bank_account || "",
                start_date: data.start_date || "",
                base_salary: data.base_salary?.toString() || "0",
                position: data.position || "",
                employment_type: data.employment_type || "Full-Time",
                status: data.status || "active",
                emergency_contacts: data.emergency_contacts || []
            });
        } catch (error) {
            console.error('Error fetching staff details:', error);
            alert("Gagal memuatkan maklumat staff.");
            router.push('/manager/staff');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateField = async (fields: Record<string, any>) => {
        if (!staff || updating) return;
        setUpdating(true);

        try {
            // Transform numeric values
            const payload = { ...fields };
            if (payload.base_salary) payload.base_salary = parseFloat(payload.base_salary);

            const { error } = await supabase
                .from('users')
                .update(payload)
                .eq('id', staff.id);

            if (error) throw error;

            setStaff({ ...staff, ...payload });
            setEditingField(null);
        } catch (error: any) {
            console.error('Error updating staff:', error);
            alert("Gagal mengemaskini maklumat: " + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0];
        if (!file || !staff || updating) return;

        setUpdating(true);
        try {
            const fileName = `${staff.id}_${fieldName}_${Date.now()}.${file.name.split('.').pop()}`;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileName', fileName);

            const res = await uploadStaffDocAction(formData);
            if (!res.success) throw new Error(res.error);

            // Update user record in DB
            const { error: updateError } = await supabase
                .from('users')
                .update({ [fieldName]: res.path })
                .eq('id', staff.id);

            if (updateError) throw updateError;

            setStaff({ ...staff, [fieldName]: res.path });
            alert("Dokumen berjaya dimuat naik!");
        } catch (error: any) {
            console.error('Error uploading file:', error);
            alert("Gagal memuat naik: " + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const EditableField = ({
        label,
        value,
        fieldName,
        icon: Icon,
        type = "text",
        isTextArea = false,
        placeholder = ""
    }: any) => {
        const isEditing = editingField === fieldName;
        const displayValue = value || '-';

        return (
            <div className="flex items-start gap-3 text-gray-300 group/field py-1">
                <Icon className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{label}</p>

                    {isEditing ? (
                        <div className="space-y-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            {isTextArea ? (
                                <textarea
                                    autoFocus
                                    value={tempValues[fieldName]}
                                    onChange={(e) => setTempValues({ ...tempValues, [fieldName]: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-primary/50 min-h-[100px] resize-none"
                                    disabled={updating}
                                />
                            ) : (
                                <input
                                    autoFocus
                                    type={type}
                                    value={tempValues[fieldName]}
                                    onChange={(e) => setTempValues({ ...tempValues, [fieldName]: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary/50"
                                    disabled={updating}
                                />
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleUpdateField({ [fieldName]: tempValues[fieldName] })}
                                    disabled={updating}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-black rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-all font-bold text-xs"
                                >
                                    {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    Simpan
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingField(null);
                                        setTempValues({ ...tempValues, [fieldName]: staff[fieldName] || "" });
                                    }}
                                    disabled={updating}
                                    className="px-4 py-2 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="flex items-center gap-2 mt-0.5 group cursor-pointer"
                            onClick={() => setEditingField(fieldName)}
                        >
                            <p className="text-white font-medium truncate">
                                {type === 'date' && value ? new Date(value).toLocaleDateString() : displayValue}
                            </p>
                            <div className="p-1 rounded-full bg-white/5 md:bg-white/0 group-hover/field:bg-white/5 transition-all">
                                <Edit3 className="w-3 h-3 text-primary opacity-100 md:opacity-0 group-hover/field:opacity-100 transition-all" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
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
                    <div className="relative group w-32 h-32 rounded-full overflow-hidden shrink-0 shadow-lg">
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                            {staff.avatar_url ? (
                                <img src={staff.avatar_url} alt={staff.full_name} className="w-full h-full object-cover" />
                            ) : (
                                staff.full_name?.substring(0, 2).toUpperCase() || "US"
                            )}
                        </div>

                        {/* Avatar Edit Overlay */}
                        <div className="absolute inset-x-0 bottom-0 py-2 bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center translate-y-2 group-hover:translate-y-0">
                            <label className="cursor-pointer">
                                <Edit3 className="w-5 h-5 text-primary" />
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            // Since we don't have a specific avatar bucket path in onboard/page.tsx,
                                            // we'll use a data URL for prompt preview or just handle it if it fails.
                                            // For now, let's try the same bucket but track the full path.
                                            handleFileUpload(e, 'avatar_url');
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        {updating && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-6 w-full">
                        <div>
                            {editingField === 'full_name' ? (
                                <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-1">
                                    <input
                                        autoFocus
                                        value={tempValues.full_name}
                                        onChange={(e) => setTempValues({ ...tempValues, full_name: e.target.value })}
                                        className="text-2xl font-bold bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-primary/50 w-full"
                                        disabled={updating}
                                    />
                                    <button
                                        onClick={() => handleUpdateField({ full_name: tempValues.full_name })}
                                        disabled={updating}
                                        className="p-3 bg-primary text-black rounded-xl hover:bg-yellow-400 transition-all active:scale-95 shrink-0"
                                    >
                                        {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => setEditingField(null)}
                                        disabled={updating}
                                        className="p-3 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 transition-all shrink-0"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <h1
                                    className="text-3xl font-bold text-white mb-2 cursor-pointer hover:text-primary transition-colors flex items-center gap-2 group"
                                    onClick={() => setEditingField('full_name')}
                                >
                                    {staff.full_name}
                                    <Edit3 className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                </h1>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {/* Position */}
                                {editingField === 'position' ? (
                                    <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-full px-2 py-0.5">
                                        <input
                                            autoFocus
                                            value={tempValues.position}
                                            onChange={(e) => setTempValues({ ...tempValues, position: e.target.value })}
                                            className="bg-transparent text-white text-xs outline-none w-24 px-2"
                                        />
                                        <button onClick={() => handleUpdateField({ position: tempValues.position })} className="text-primary hover:text-yellow-400"><Check className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setEditingField(null)} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setEditingField('position')}
                                        className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold capitalize hover:bg-primary/30 transition-all flex items-center gap-1.5"
                                    >
                                        Stesen: {staff.position || 'Staff'}
                                        <Edit3 className="w-3 h-3 opacity-50" />
                                    </button>
                                )}

                                {/* Employment Type */}
                                {editingField === 'employment_type' ? (
                                    <select
                                        autoFocus
                                        value={tempValues.employment_type}
                                        onChange={(e) => handleUpdateField({ employment_type: e.target.value })}
                                        className="px-3 py-1 rounded-full bg-white/10 text-white text-xs outline-none border border-white/10"
                                        onBlur={() => setEditingField(null)}
                                    >
                                        <option value="Full-Time" className="bg-surface text-white">Full-Time</option>
                                        <option value="Part-Time" className="bg-surface text-white">Part-Time</option>
                                        <option value="Contract" className="bg-surface text-white">Contract</option>
                                    </select>
                                ) : (
                                    <button
                                        onClick={() => setEditingField('employment_type')}
                                        className="px-3 py-1 rounded-full bg-white/10 text-white text-xs capitalize hover:bg-white/20 transition-all flex items-center gap-1.5"
                                    >
                                        {staff.employment_type || 'Full-Time'}
                                        <Edit3 className="w-3 h-3 opacity-50" />
                                    </button>
                                )}

                                {/* Status */}
                                {editingField === 'status' ? (
                                    <select
                                        autoFocus
                                        value={tempValues.status}
                                        onChange={(e) => handleUpdateField({ status: e.target.value })}
                                        className="px-3 py-1 rounded-full bg-white/10 text-white text-xs outline-none border border-white/10"
                                        onBlur={() => setEditingField(null)}
                                    >
                                        <option value="active" className="bg-surface text-green-400">Active</option>
                                        <option value="inactive" className="bg-surface text-red-400">Inactive</option>
                                    </select>
                                ) : (
                                    <button
                                        onClick={() => setEditingField('status')}
                                        className={`px-3 py-1 rounded-full text-xs capitalize transition-all flex items-center gap-1.5 ${staff.status === 'active' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                            }`}
                                    >
                                        {staff.status || 'Active'}
                                        <Edit3 className="w-3 h-3 opacity-50" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                            <div className="space-y-4">
                                <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider">Maklumat Peribadi</h3>

                                <EditableField
                                    label="No. Kad Pengenalan"
                                    value={staff.ic_number}
                                    fieldName="ic_number"
                                    icon={User}
                                />

                                <EditableField
                                    label="No. Telefon"
                                    value={staff.phone}
                                    fieldName="phone"
                                    icon={Phone}
                                    type="tel"
                                />

                                <EditableField
                                    label="Email"
                                    value={staff.email}
                                    fieldName="email"
                                    icon={Mail}
                                    type="email"
                                />

                                <EditableField
                                    label="Alamat"
                                    value={staff.address}
                                    fieldName="address"
                                    icon={MapPin}
                                    isTextArea={true}
                                />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider">Maklumat Pekerjaan</h3>

                                <div className="flex items-start gap-3 text-gray-300 group/field py-1">
                                    <CreditCard className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Bank & No. Akaun</p>
                                        {editingField === 'bank' ? (
                                            <div className="space-y-3 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <BankPicker
                                                    value={tempValues.bank_name}
                                                    onChange={(val) => setTempValues({ ...tempValues, bank_name: val })}
                                                    disabled={updating}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        placeholder="No. Akaun"
                                                        value={tempValues.bank_account}
                                                        onChange={(e) => setTempValues({ ...tempValues, bank_account: e.target.value })}
                                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-primary/50"
                                                        disabled={updating}
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateField({ bank_name: tempValues.bank_name, bank_account: tempValues.bank_account })}
                                                        disabled={updating}
                                                        className="p-2 bg-primary text-black rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-all active:scale-95"
                                                    >
                                                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingField(null)}
                                                        disabled={updating}
                                                        className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="flex items-center gap-2 mt-0.5 group cursor-pointer"
                                                onClick={() => setEditingField('bank')}
                                            >
                                                <p className="font-medium text-white truncate text-sm">
                                                    {staff.bank_name || '-'} • {staff.bank_account || '-'}
                                                </p>
                                                <div className="p-1 rounded-full bg-white/5 md:bg-white/0 group-hover/field:bg-white/5 transition-all">
                                                    <Edit3 className="w-3 h-3 text-primary opacity-100 md:opacity-0 group-hover/field:opacity-100 transition-all" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <EditableField
                                    label="Tarikh Mula Kerja"
                                    value={staff.start_date}
                                    fieldName="start_date"
                                    icon={Calendar}
                                    type="date"
                                />

                                <div className="flex items-start gap-3 text-gray-300 group/field py-1">
                                    <div className="w-5 h-5 flex items-center justify-center text-gray-500 font-bold text-[10px] border border-gray-500 rounded mt-0.5 shrink-0">RM</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Gaji Harian</p>
                                        {editingField === 'base_salary' ? (
                                            <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold text-xs">RM</span>
                                                    <input
                                                        type="number"
                                                        value={tempValues.base_salary}
                                                        onChange={(e) => setTempValues({ ...tempValues, base_salary: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-white text-sm outline-none focus:border-primary/50 font-bold"
                                                        disabled={updating}
                                                        autoFocus
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleUpdateField({ base_salary: tempValues.base_salary })}
                                                    disabled={updating}
                                                    className="p-2 bg-primary text-black rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-all active:scale-95"
                                                >
                                                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => setEditingField(null)}
                                                    disabled={updating}
                                                    className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className="flex items-center gap-2 mt-0.5 group cursor-pointer"
                                                onClick={() => setEditingField('base_salary')}
                                            >
                                                <p className="text-base font-bold text-white tracking-tight">
                                                    RM {staff.base_salary || '0'} <span className="text-[10px] text-gray-500 font-normal">/ Hari</span>
                                                </p>
                                                <div className="p-1 rounded-full bg-white/5 md:bg-white/0 group-hover/field:bg-white/5 transition-all">
                                                    <Edit3 className="w-3 h-3 text-primary opacity-100 md:opacity-0 group-hover/field:opacity-100 transition-all" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contacts */}
                        <div className="pt-6 border-t border-white/5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider">Maklumat Kecemasan (Waris)</h3>
                                <button
                                    onClick={() => {
                                        const newContacts = [...(tempValues.emergency_contacts || []), { name: "", phone: "", relation: "" }];
                                        setTempValues({ ...tempValues, emergency_contacts: newContacts });
                                        setEditingField(`waris_${newContacts.length - 1}`);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 text-primary text-xs font-bold hover:bg-white/10 transition-all border border-white/5"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Tambah Waris
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tempValues.emergency_contacts && tempValues.emergency_contacts.map((contact: any, idx: number) => {
                                    const fieldKey = `waris_${idx}`;
                                    const isEditing = editingField === fieldKey;

                                    return (
                                        <div key={idx} className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-3 relative group/waris">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Waris {idx + 1}</p>
                                                {!isEditing && (
                                                    <button
                                                        onClick={() => setEditingField(fieldKey)}
                                                        className="p-1.5 rounded-full bg-white/5 text-primary opacity-100 md:opacity-0 md:group-hover/waris:opacity-100 transition-all hover:bg-white/10"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {isEditing ? (
                                                <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                                    <input
                                                        placeholder="Nama Waris"
                                                        value={contact.name}
                                                        onChange={(e) => {
                                                            const newContacts = [...tempValues.emergency_contacts];
                                                            newContacts[idx].name = e.target.value;
                                                            setTempValues({ ...tempValues, emergency_contacts: newContacts });
                                                        }}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary/50"
                                                    />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            placeholder="Hubungan"
                                                            value={contact.relation}
                                                            onChange={(e) => {
                                                                const newContacts = [...tempValues.emergency_contacts];
                                                                newContacts[idx].relation = e.target.value;
                                                                setTempValues({ ...tempValues, emergency_contacts: newContacts });
                                                            }}
                                                            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary/50"
                                                        />
                                                        <input
                                                            placeholder="No. Telefon"
                                                            value={contact.phone}
                                                            onChange={(e) => {
                                                                const newContacts = [...tempValues.emergency_contacts];
                                                                newContacts[idx].phone = e.target.value;
                                                                setTempValues({ ...tempValues, emergency_contacts: newContacts });
                                                            }}
                                                            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary/50"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateField({ emergency_contacts: tempValues.emergency_contacts })}
                                                            disabled={updating}
                                                            className="flex-1 py-2 bg-primary text-black rounded-xl hover:bg-yellow-400 font-bold text-xs"
                                                        >
                                                            {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Simpan"}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const newContacts = tempValues.emergency_contacts.filter((_: any, i: number) => i !== idx);
                                                                setTempValues({ ...tempValues, emergency_contacts: newContacts });
                                                                handleUpdateField({ emergency_contacts: newContacts });
                                                            }}
                                                            disabled={updating}
                                                            className="px-3 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all"
                                                            title="Buang Waris"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingField(null)}
                                                            className="px-4 py-2 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 text-xs font-bold"
                                                        >
                                                            Batal
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-white font-bold">{contact.name || '-'}</p>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500 text-xs">{contact.relation || 'Hubungan'}</span>
                                                        <span className="text-gray-300 font-medium">{contact.phone || '-'}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                                {(!tempValues.emergency_contacts || tempValues.emergency_contacts.length === 0) && (
                                    <p className="text-sm text-gray-500 italic">Tiada maklumat waris.</p>
                                )}
                            </div>
                        </div>

                        {/* IC Documents */}
                        <div className="pt-6 border-t border-white/5">
                            <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-4">Dokumen IC</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* IC Front */}
                                <div className="space-y-2 group/ic relative">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-gray-500">IC Depan</p>
                                        <label className="cursor-pointer opacity-100 md:opacity-0 md:group-ic:opacity-100 transition-all hover:text-primary">
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'ic_front_url')} />
                                        </label>
                                    </div>
                                    <div className="relative aspect-[1.6/1] rounded-2xl overflow-hidden border border-white/10 bg-black/20 group hover:border-primary/50 transition-all">
                                        {staff.ic_front_url ? (
                                            <>
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/staff-docs/${staff.ic_front_url}`}
                                                    alt="IC Depan"
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                                {/* View/Edit Overlay */}
                                                <div className="absolute inset-x-0 bottom-0 md:inset-0 bg-black/60 md:bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all flex md:flex-col items-center justify-center gap-2 md:gap-4 p-3 md:p-0 cursor-default">
                                                    <button
                                                        onClick={() => setSelectedImage(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/staff-docs/${staff.ic_front_url}`)}
                                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/20 transition-all text-white text-[10px] md:text-xs font-bold uppercase tracking-wider"
                                                    >
                                                        <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                                                        <span className="hidden sm:inline">Lihat Penuh</span>
                                                        <span className="sm:hidden">Lihat</span>
                                                    </button>
                                                    <label className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-primary/20 backdrop-blur-md rounded-xl border border-primary/30 hover:bg-primary/30 transition-all text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider cursor-pointer">
                                                        <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                        <span className="hidden sm:inline">Tukar Gambar</span>
                                                        <span className="sm:hidden">Tukar</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'ic_front_url')} />
                                                    </label>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                                                <Mail className="w-8 h-8 opacity-20" />
                                                <p className="text-sm">Tiada Gambar</p>
                                            </div>
                                        )}
                                        {updating && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* IC Back */}
                                <div className="space-y-2 group/ic relative">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-gray-500">IC Belakang</p>
                                        <label className="cursor-pointer opacity-100 md:opacity-0 md:group-ic:opacity-100 transition-all hover:text-primary">
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'ic_back_url')} />
                                        </label>
                                    </div>
                                    <div className="relative aspect-[1.6/1] rounded-2xl overflow-hidden border border-white/10 bg-black/20 group hover:border-primary/50 transition-all">
                                        {staff.ic_back_url ? (
                                            <>
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/staff-docs/${staff.ic_back_url}`}
                                                    alt="IC Belakang"
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                                {/* View/Edit Overlay */}
                                                <div className="absolute inset-x-0 bottom-0 md:inset-0 bg-black/60 md:bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all flex md:flex-col items-center justify-center gap-2 md:gap-4 p-3 md:p-0 cursor-default">
                                                    <button
                                                        onClick={() => setSelectedImage(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/staff-docs/${staff.ic_back_url}`)}
                                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/20 transition-all text-white text-[10px] md:text-xs font-bold uppercase tracking-wider"
                                                    >
                                                        <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                                                        <span className="hidden sm:inline">Lihat Penuh</span>
                                                        <span className="sm:hidden">Lihat</span>
                                                    </button>
                                                    <label className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-primary/20 backdrop-blur-md rounded-xl border border-primary/30 hover:bg-primary/30 transition-all text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider cursor-pointer">
                                                        <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                        <span className="hidden sm:inline">Tukar Gambar</span>
                                                        <span className="sm:hidden">Tukar</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'ic_back_url')} />
                                                    </label>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                                                <Mail className="w-8 h-8 opacity-20" />
                                                <p className="text-sm">Tiada Gambar</p>
                                            </div>
                                        )}
                                        {updating && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedImage && (
                <FullScreenModal
                    url={selectedImage}
                    onClose={() => setSelectedImage(null)}
                />
            )}
        </div>
    );
}
