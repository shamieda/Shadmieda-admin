"use client";

import { useState, useEffect } from "react";
import { Wallet, DollarSign, AlertCircle, CheckCircle, Loader2, ChevronLeft, ChevronRight, Calendar, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestAdvanceAction } from "@/app/actions/advance";

export default function StaffPayrollPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [shopSettings, setShopSettings] = useState<any>(null);
    const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState("");

    useEffect(() => {
        fetchPayrollData();
    }, [month]);

    const fetchPayrollData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // 1. Get Profile
                const { data: profileData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('auth_id', user.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);

                    // 2. Get Attendance for selected month
                    const startDate = `${month}-01T00:00:00`;
                    const endDate = `${month}-31T23:59:59`;

                    const { data: attendanceData } = await supabase
                        .from('attendance')
                        .select('*')
                        .eq('user_id', profileData.id)
                        .gte('clock_in', startDate)
                        .lte('clock_in', endDate);

                    setAttendance(attendanceData || []);

                    // 3. Get Shop Settings
                    const { data: settings } = await supabase
                        .from('shop_settings')
                        .select('*')
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .single();
                    setShopSettings(settings);
                }
            }
        } catch (error) {
            console.error('Error fetching payroll data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculation Logic
    const basicSalary = profile?.base_salary || 0;
    const daysWorked = attendance.length;
    const targetDays = 26;
    const dailyRate = basicSalary / targetDays;
    const currentBasic = dailyRate * daysWorked;

    const lateCount = attendance.filter((a: any) => a.status === 'late').length;
    const penalty = attendance.reduce((sum, a) => sum + (Number(a.penalty_amount) || 0), 0);

    // Onboarding Kit Deduction (First Month Only)
    let onboardingDeduction = 0;
    if (profile?.start_date && profile.start_date.substring(0, 7) === month && profile.onboarding_kit && Array.isArray(profile.onboarding_kit)) {
        onboardingDeduction = profile.onboarding_kit.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
    }

    const bonus = daysWorked >= targetDays ? (Number(shopSettings?.attendance_bonus) || 0) : 0;
    const estimatedSalary = currentBasic + bonus - penalty - onboardingDeduction;

    const handleRequestAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(advanceAmount);
        if (isNaN(amount) || amount <= 0) return;

        setLoading(true);
        const result = await requestAdvanceAction(amount);
        setLoading(false);

        if (result.success) {
            alert(`Permohonan Advance RM${amount.toFixed(2)} telah dihantar untuk kelulusan Manager.`);
            setShowAdvanceModal(false);
            setAdvanceAmount("");
        } else {
            alert("Ralat: " + result.error);
        }
    };


    const handleMonthChange = (direction: 'prev' | 'next') => {
        const date = new Date(month + '-01');
        date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
        setMonth(date.toISOString().substring(0, 7));
    };

    const currentMonth = new Date().toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>Memuatkan maklumat gaji...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gaji & Advance</h1>
                    <p className="text-gray-400 text-sm">Anggaran gaji semasa untuk {month}</p>
                </div>
                <div className="flex items-center gap-2 bg-surface border border-white/10 rounded-lg p-1">
                    <button
                        onClick={() => handleMonthChange('prev')}
                        className="p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="relative">
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="bg-transparent text-white font-bold outline-none text-sm w-32 text-center cursor-pointer"
                        />
                    </div>
                    <button
                        onClick={() => handleMonthChange('next')}
                        className="p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Salary Card */}
            <div className="bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10">
                    <p className="text-gray-400 text-sm font-medium mb-1">Anggaran Gaji Bersih</p>
                    <h2 className="text-4xl font-bold text-white mb-6">RM {estimatedSalary.toFixed(2)}</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500 mb-1">Gaji Asas (Pro-rated)</p>
                            <p className="text-lg font-bold text-white">RM {currentBasic.toFixed(2)}</p>
                            <p className="text-xs text-gray-500 mt-1">{daysWorked} / {targetDays} Hari</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500 mb-1">Potongan / Penalti</p>
                            <p className="text-lg font-bold text-red-400">- RM {penalty.toFixed(2)}</p>
                            <p className="text-xs text-gray-500 mt-1">{lateCount} Kali Lewat</p>
                        </div>

                        {onboardingDeduction > 0 && (
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5 col-span-2">
                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Onboarding Kit</p>
                                <p className="text-lg font-bold text-purple-400">- RM {onboardingDeduction.toFixed(2)}</p>
                                <p className="text-xs text-gray-500 mt-1">Ditolak sekali sahaja (Bulan Pertama)</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Advance Request Section */}
            <div className="bg-surface border border-white/5 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            Mohon Advance
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">Had kelayakan anda: <span className="text-white font-bold">RM {(Number(shopSettings?.advance_limit) || 500).toFixed(2)}</span></p>
                    </div>
                    <button
                        onClick={() => setShowAdvanceModal(true)}
                        className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                    >
                        <DollarSign className="w-4 h-4" />
                        Mohon Sekarang
                    </button>
                </div>

                <div className="text-center py-8 bg-black/20 rounded-xl border border-dashed border-white/5">
                    <p className="text-gray-500 text-xs">Tiada permohonan advance buat masa ini.</p>
                </div>
            </div>

            {/* Advance Modal */}
            {showAdvanceModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-white mb-4">Permohonan Advance</h3>
                        <form onSubmit={handleRequestAdvance}>
                            <div className="mb-6">
                                <label className="text-sm text-gray-400 block mb-2">Jumlah Diperlukan (RM)</label>
                                <input
                                    type="number"
                                    value={advanceAmount}
                                    onChange={(e) => setAdvanceAmount(e.target.value)}
                                    placeholder="Contoh: 50"
                                    required
                                    className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-2">Maksimum: RM {(Number(shopSettings?.advance_limit) || 500).toFixed(2)}</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanceModal(false)}
                                    className="flex-1 py-3 rounded-lg bg-white/5 text-white font-medium hover:bg-white/10"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-lg bg-primary text-black font-bold hover:bg-yellow-400"
                                >
                                    Hantar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
