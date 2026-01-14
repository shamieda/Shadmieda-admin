"use client";

import { useEffect, useState } from "react";
import { Wallet, Send, AlertCircle, CheckCircle, DollarSign, Loader2, User, FileText, Printer, X, ChevronLeft, ChevronRight, Package, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getRankingsAction } from "@/app/actions/get-rankings";

export default function PayrollPage() {
    const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
    const [staffPayroll, setStaffPayroll] = useState<any[]>([]);
    const [rankings, setRankings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [shopSettings, setShopSettings] = useState<any>(null);
    const [selectedSlip, setSelectedSlip] = useState<any>(null);

    useEffect(() => {
        fetchPayrollData();
    }, [month]);

    const fetchPayrollData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Shop Settings
            const { data: settings } = await supabase
                .from('shop_settings')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();
            setShopSettings(settings);

            // 2. Fetch all staff
            const { data: staffList } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'staff');

            // 3. Fetch attendance for the month
            const startDate = `${month}-01T00:00:00`;
            const endDate = `${month}-31T23:59:59`; // Simple end date logic
            const { data: attendance } = await supabase
                .from('attendance')
                .select('*')
                .gte('clock_in', startDate)
                .lte('clock_in', endDate);

            // 4. Fetch Rankings for the month
            const { rankings: rankingData } = await getRankingsAction(month);
            setRankings(rankingData || []);

            // 5. Fetch Ranking Bonuses
            const { data: rankingBonuses } = await supabase
                .from('bonus_configs')
                .select('*')
                .eq('requirement_type', 'ranking');

            // 6. Process Payroll for each staff
            const processed = (staffList || []).map(staff => {
                const staffAttendance = attendance?.filter(a => a.user_id === staff.id) || [];
                const daysWorked = staffAttendance.length;
                const lateCount = staffAttendance.filter(a => a.status === 'late').length;

                // Sum real penalty amounts from attendance records
                const penalty = staffAttendance.reduce((sum, a) => sum + (Number(a.penalty_amount) || 0), 0);

                // Bonus logic: If worked >= 26 days, give attendance bonus from settings
                let bonus = 0;
                if (daysWorked >= 26 && settings?.attendance_bonus) {
                    bonus = Number(settings.attendance_bonus);
                }

                // Ranking Bonus logic
                const staffRank = rankingData?.findIndex((r: any) => r.id === staff.id);
                if (staffRank !== undefined && staffRank !== -1) {
                    const rankPos = staffRank + 1;
                    const rankBonus = rankingBonuses?.find(b => parseInt(b.requirement_value) === rankPos);
                    if (rankBonus) {
                        bonus += Number(rankBonus.value);
                    }
                }

                const dailyRate = Number(staff.base_salary || 0);

                // Onboarding Kit Deduction (First Month Only)
                let onboardingDeduction = 0;
                if (staff.start_date && staff.start_date.substring(0, 7) === month && staff.onboarding_kit && Array.isArray(staff.onboarding_kit)) {
                    onboardingDeduction = staff.onboarding_kit.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
                }

                const earnedSalary = (dailyRate * daysWorked) + bonus - penalty - onboardingDeduction;

                return {
                    ...staff,
                    daysWorked,
                    lateCount,
                    penalty,
                    bonus,
                    onboardingDeduction,
                    earnedSalary,
                    dailyRate,
                    canRequestAdvance: daysWorked >= 3
                };
            });

            setStaffPayroll(processed);
        } catch (error) {
            console.error('Error fetching payroll data:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendWhatsApp = (staff: any) => {
        const message = `
*SLIP GAJI SHAMIEDA FAMILY*
---------------------------
Nama: ${staff.full_name}
Bulan: ${month}

Gaji Harian: RM${staff.base_salary}
Hari Bekerja: ${staff.daysWorked} hari

+ Bonus Kehadiran: RM${staff.bonus.toFixed(2)}
- Penalti Lewat (${staff.lateCount}x): RM${staff.penalty.toFixed(2)}

*BERSIH: RM${staff.earnedSalary.toFixed(2)}*
---------------------------
Terima kasih atas usaha anda!
    `.trim();

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const date = new Date(month + '-01');
        date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
        setMonth(date.toISOString().substring(0, 7));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pengurusan Gaji</h1>
                    <p className="text-gray-400 text-sm">Kira gaji, bonus, dan penalti secara automatik.</p>
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

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p>Mengira gaji staff...</p>
                </div>
            ) : staffPayroll.length === 0 ? (
                <div className="bg-surface border border-white/5 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Tiada Staff Dijumpai</h3>
                    <p className="text-gray-500 text-sm">Sila daftar staff untuk mula mengira gaji.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {staffPayroll.map((staff) => (
                        <div key={staff.id} className="bg-surface border border-white/5 rounded-xl p-6 hover:border-primary/30 transition-all">
                            <div className="flex flex-col md:flex-row justify-between gap-6">

                                {/* Staff Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-white">{staff.full_name}</h3>
                                        <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-300 capitalize">Stesen: {staff.position || 'Staff'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                                        <p>Gaji Harian: <span className="text-white">RM{staff.base_salary}</span></p>
                                        <p>Hari Bekerja: <span className="text-white">{staff.daysWorked} hari</span></p>
                                        <p>Lewat: <span className={`font-bold ${staff.lateCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{staff.lateCount} kali</span></p>
                                        <p>Advance: <span className="text-white">RM0.00</span></p>
                                    </div>
                                </div>

                                {/* Calculations */}
                                <div className="flex-1 bg-black/30 rounded-lg p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Gaji Asas (Pro-rated)</span>
                                        <span className="text-white">RM{(staff.dailyRate * staff.daysWorked).toFixed(2)}</span>
                                    </div>

                                    {staff.bonus > 0 && (
                                        <div className="flex justify-between text-green-400">
                                            <span className="flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Bonus {rankings?.some((r: any) => r.id === staff.id) ? '& Ranking' : 'Kehadiran'}
                                            </span>
                                            <span>+ RM{staff.bonus.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {staff.penalty > 0 && (
                                        <div className="flex justify-between text-red-400">
                                            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Penalti Lewat</span>
                                            <span>- RM{staff.penalty.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {staff.onboardingDeduction > 0 && (
                                        <div className="flex justify-between text-purple-400">
                                            <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Onboarding Kit</span>
                                            <span>- RM{staff.onboardingDeduction.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="border-t border-white/10 pt-2 mt-2 flex justify-between items-center">
                                        <span className="font-bold text-white">Gaji Bersih</span>
                                        <span className="text-xl font-bold text-primary">RM{staff.earnedSalary.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 justify-center min-w-[150px]">
                                    <button
                                        onClick={() => sendWhatsApp(staff)}
                                        className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold transition-colors text-sm"
                                    >
                                        <Send className="w-4 h-4" />
                                        WhatsApp Slip
                                    </button>

                                    <button
                                        onClick={() => setSelectedSlip(staff)}
                                        className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-bold transition-colors text-sm"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Lihat Slip
                                    </button>

                                    {staff.canRequestAdvance ? (
                                        <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg text-sm transition-colors">
                                            <DollarSign className="w-4 h-4" />
                                            Beri Advance
                                        </button>
                                    ) : (
                                        <div className="text-center text-xs text-gray-600 py-2 border border-white/5 rounded-lg">
                                            Tidak Layak Advance
                                            <br />(Kerja &lt; 3 hari)
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Payslip Modal */}
            {selectedSlip && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 print:p-0 print:bg-white">
                    <div className="bg-white text-black rounded-2xl w-full max-w-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
                        {/* Modal Header (Hidden in Print) */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 print:hidden">
                            <h3 className="font-bold text-lg">Slip Gaji Terperinci</h3>
                            <button onClick={() => setSelectedSlip(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Slip Content */}
                        <div className="p-8 space-y-6 print:p-0">
                            {/* Header */}
                            <div className="text-center border-b-2 border-black pb-6">
                                <h1 className="text-2xl font-black uppercase tracking-wider">{shopSettings?.shop_name || "NAMA KEDAI"}</h1>
                                <p className="text-sm text-gray-600 mt-1">{shopSettings?.address || "Alamat Kedai"}</p>
                                <div className="mt-4 inline-block bg-black text-white px-4 py-1 rounded-full text-sm font-bold">
                                    SLIP GAJI: {month}
                                </div>
                            </div>

                            {/* Staff Info */}
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Nama Staff</p>
                                    <p className="font-bold text-lg">{selectedSlip.full_name}</p>
                                    <p className="text-sm text-gray-600">{selectedSlip.position || 'Staff'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">ID Pekerja</p>
                                    <p className="font-mono">{selectedSlip.id.substring(0, 8).toUpperCase()}</p>
                                    <p className="text-sm text-gray-600">Hari Bekerja: {selectedSlip.daysWorked} hari</p>
                                </div>
                            </div>

                            {/* Earnings Table */}
                            <div>
                                <h4 className="font-bold border-b border-gray-300 pb-2 mb-3 flex justify-between items-center">
                                    PENDAPATAN
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Tambah</span>
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Gaji Asas (Pro-rated)</span>
                                        <span className="font-mono">RM {(selectedSlip.dailyRate * selectedSlip.daysWorked).toFixed(2)}</span>
                                    </div>
                                    {selectedSlip.bonus > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>Bonus Kehadiran Penuh</span>
                                            <span className="font-mono">RM {selectedSlip.bonus.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Deductions Table */}
                            <div>
                                <h4 className="font-bold border-b border-gray-300 pb-2 mb-3 flex justify-between items-center">
                                    POTONGAN
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Tolak</span>
                                </h4>
                                <div className="space-y-2 text-sm">
                                    {selectedSlip.penalty > 0 ? (
                                        <div className="flex justify-between text-red-600">
                                            <span>Penalti Lewat ({selectedSlip.lateCount} kali)</span>
                                            <span className="font-mono">- RM {selectedSlip.penalty.toFixed(2)}</span>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 italic text-xs">Tiada potongan.</div>
                                    )}

                                    {selectedSlip.onboardingDeduction > 0 && (
                                        <div className="flex justify-between text-purple-600">
                                            <span>Onboarding Kit</span>
                                            <span className="font-mono">- RM {selectedSlip.onboardingDeduction.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Net Salary */}
                            <div className="bg-gray-100 p-6 rounded-xl flex justify-between items-center border border-gray-200 print:border-black print:bg-transparent">
                                <div>
                                    <p className="text-sm text-gray-500 font-bold uppercase">Gaji Bersih</p>
                                    <p className="text-xs text-gray-400">Termasuk semua elaun & potongan</p>
                                </div>
                                <p className="text-3xl font-black text-black">RM {selectedSlip.earnedSalary.toFixed(2)}</p>
                            </div>

                            {/* Footer */}
                            <div className="text-center text-[10px] text-gray-400 pt-8 print:pt-12">
                                <p>Dokumen ini dijana secara automatik oleh sistem.</p>
                                <p>{new Date().toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Modal Footer (Hidden in Print) */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3 print:hidden">
                            <button
                                onClick={() => setSelectedSlip(null)}
                                className="flex-1 py-3 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex-1 py-3 rounded-lg font-bold bg-black text-white hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Cetak Slip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
