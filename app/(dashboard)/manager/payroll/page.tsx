"use client";

import { useEffect, useState, useRef } from "react";
import { Wallet, Send, AlertCircle, CheckCircle, DollarSign, Loader2, User, FileText, Printer, X, ChevronLeft, ChevronRight, Package, Trophy, Banknote, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getRankingsAction } from "@/app/actions/get-rankings";
import PaymentModal from "@/components/PaymentModal";
import { Eye, ExternalLink } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function PayrollPage() {
    const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
    const [staffPayroll, setStaffPayroll] = useState<any[]>([]);
    const [rankings, setRankings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [shopSettings, setShopSettings] = useState<any>(null);
    const [selectedSlip, setSelectedSlip] = useState<any>(null);
    const [payingStaff, setPayingStaff] = useState<any>(null);
    const [proofViewer, setProofViewer] = useState<string | null>(null);
    const payslipRef = useRef<HTMLDivElement>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

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

            // 2b. Fetch existing payroll records for this month
            const { data: payrollRecords } = await supabase
                .from('payroll')
                .select('*')
                .eq('month', month);

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

            // 6. Fetch Approved Leaves for the month
            const { data: leaves } = await supabase
                .from('leave_applications')
                .select('*')
                .eq('status', 'Approved')
                .gte('start_date', startDate)
                .lte('end_date', endDate) // Simple overlap check improvement needed for production but ok for now
                .gte('start_date', startDate)
                .lte('end_date', endDate) // Simple overlap check improvement needed for production but ok for now

            // 7. Fetch Approved Advances for the month
            const { data: advances } = await supabase
                .from('advance_requests')
                .select('*')
                .eq('status', 'approved')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            // 8. Process Payroll for each staff
            const processed = (staffList || []).map(staff => {
                const staffAttendance = attendance?.filter(a => a.user_id === staff.id) || [];
                const daysWorked = staffAttendance.length;
                const lateCount = staffAttendance.filter(a => a.status === 'late').length;

                // Sum real penalty amounts from attendance records
                const penalty = staffAttendance.reduce((sum, a) => sum + (Number(a.penalty_amount) || 0), 0);

                // Calculate Approved Leave Days
                const staffLeaves = leaves?.filter(l => l.user_id === staff.id) || [];
                let leaveDays = 0;
                staffLeaves.forEach(leave => {
                    const start = new Date(leave.start_date);
                    const end = new Date(leave.end_date);
                    // Simple day count approximation
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    leaveDays += diffDays;
                });


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

                // Advance Deduction
                const staffAdvances = advances?.filter(a => a.user_id === staff.id) || [];
                const advanceAmount = staffAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

                const earnedSalary = (dailyRate * daysWorked) + bonus - penalty - onboardingDeduction - advanceAmount;


                // Sync with DB payroll record
                const dbRecord = payrollRecords?.find(p => p.user_id === staff.id);

                return {
                    ...staff,
                    daysWorked,
                    leaveDays,
                    lateCount,
                    penalty,
                    bonus,
                    onboardingDeduction,
                    advanceAmount,
                    earnedSalary,
                    dailyRate,
                    canRequestAdvance: daysWorked >= 3,
                    paymentStatus: dbRecord?.status || 'pending',
                    paymentMethod: dbRecord?.payment_method,
                    paymentProofUrl: dbRecord?.payment_proof_url,
                    paidAt: dbRecord?.paid_at
                };
            });

            setStaffPayroll(processed);
        } catch (error) {
            console.error('Error fetching payroll data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShareWhatsApp = async (staff: any) => {
        if (!selectedSlip || selectedSlip.id !== staff.id) {
            setSelectedSlip(staff);
            // Wait for render
            setTimeout(() => sharePdfLogic(staff), 500);
            return;
        }
        sharePdfLogic(staff);
    };

    const sharePdfLogic = async (staff: any) => {
        if (!payslipRef.current) return;
        setGeneratingPdf(true);

        try {
            const canvas = await html2canvas(payslipRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                height: payslipRef.current.scrollHeight,
                windowHeight: payslipRef.current.scrollHeight + 50,
                scrollY: 0
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const widthRatio = pageWidth / canvas.width;
            const heightRatio = pageHeight / canvas.height;
            const ratio = widthRatio < heightRatio ? widthRatio : heightRatio;

            const pdfWidth = canvas.width * ratio;
            const pdfHeight = canvas.height * ratio;

            // Center content
            const x = (pageWidth - pdfWidth) / 2;
            const y = (pageHeight - pdfHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, 0, pdfWidth, pdfHeight);
            const fileName = `Slip_Gaji_${staff.full_name.replace(/\s+/g, '_')}_${month}.pdf`;

            // Try native sharing (Mobile)
            if (navigator.share) {
                const blob = pdf.output('blob');
                const file = new File([blob], fileName, { type: 'application/pdf' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Slip Gaji',
                        text: `Slip Gaji untuk ${staff.full_name} - ${month}`
                    });
                    setGeneratingPdf(false);
                    return;
                }
            }

            // Fallback: Download and simple message
            pdf.save(fileName);
            const message = `*SLIP GAJI SHAMIEDA*\nSila lihat slip gaji PDF yang telah dimuat turun.`;
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');

        } catch (error: any) {
            console.error("Error generating PDF:", error);
            alert(`Gagal menjana PDF: ${error?.message || error}`);
        } finally {
            setGeneratingPdf(false);
        }
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
            <div className="print:hidden space-y-6">
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
                                            <p>Cuti: <span className="text-blue-400 font-bold">{staff.leaveDays || 0} hari</span></p>
                                            <p>Lewat: <span className={`font-bold ${staff.lateCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{staff.lateCount} kali</span></p>
                                            <p className="flex items-center gap-1">Status:
                                                {staff.paymentStatus === 'paid' ? (
                                                    <span className="text-green-400 font-bold flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Sudah Bayar
                                                    </span>
                                                ) : (
                                                    <span className="text-yellow-400 font-bold flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> Belum Bayar
                                                    </span>
                                                )}
                                            </p>
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
                                        {staff.paymentStatus === 'paid' ? (
                                            <div className="space-y-2">
                                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                                                    <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Gaji Telah Dibayar</p>
                                                    <p className="text-sm text-white font-bold">{new Date(staff.paidAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{staff.paymentMethod}</p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    {staff.paymentProofUrl && (
                                                        <button
                                                            onClick={() => setProofViewer(staff.paymentProofUrl)}
                                                            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            Bukti
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setSelectedSlip(staff)}
                                                        className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        Slip
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => handleShareWhatsApp(staff)}
                                                    disabled={generatingPdf}
                                                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 active:scale-95 disabled:opacity-50"
                                                >
                                                    {generatingPdf && selectedSlip?.id === staff.id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                        </svg>
                                                    )}
                                                    WhatsApp PDF
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => setPayingStaff(staff)}
                                                    className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-95 group"
                                                >
                                                    <Banknote className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                                    Bayar Sekarang
                                                </button>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => setSelectedSlip(staff)}
                                                        className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-400 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        Lihat Slip
                                                    </button>
                                                    <button
                                                        onClick={() => handleShareWhatsApp(staff)}
                                                        disabled={generatingPdf}
                                                        className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {generatingPdf && selectedSlip?.id === staff.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                            </svg>
                                                        )}
                                                        WhatsApp
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {staff.canRequestAdvance && staff.paymentStatus !== 'paid' && (
                                            <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-500 py-2 rounded-xl text-xs transition-colors mt-1">
                                                <DollarSign className="w-3 h-3" />
                                                Beri Advance
                                            </button>
                                        )}
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Payslip Modal */}
            {selectedSlip && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 sm:p-6 print:p-0 print:bg-white overflow-hidden">
                    {/* Added p-4 sm:p-6 for padding on mobile/desktop */}
                    <div className="bg-white text-black rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:w-full print:max-w-none print:shadow-none print:rounded-none print:max-h-none">
                        {/* Modal Header (Hidden in Print) */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 print:hidden shrink-0 sticky top-0 z-10">
                            <h3 className="font-bold text-lg">Slip Gaji Terperinci</h3>
                            <button onClick={() => setSelectedSlip(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto flex-1">
                            <div ref={payslipRef} className="p-0 bg-[#ffffff] print:p-0 flex justify-center">
                                {/* A4 Container */}
                                <div className="w-full md:w-[210mm] min-h-[297mm] bg-[#ffffff] p-[15mm] md:p-[20mm] relative flex flex-col justify-between text-[#000000] shadow-none print:shadow-none print:w-[210mm] print:h-[297mm] print:p-[20mm] border border-[#e5e7eb] print:border-none my-4 print:my-0">

                                    {/* Watermark/Background (Optional) */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none overflow-hidden">
                                        <img src="/logo.png" className="w-[80%] grayscale" />
                                    </div>

                                    {/* Header Section */}
                                    <div className="relative z-10">
                                        <div className="flex flex-col items-center border-b-2 border-[#000000] pb-6 mb-8">
                                            <img src="/logo.png" alt="Shamieda Logo" className="h-24 w-auto mb-4 object-contain" />
                                            <h1 className="text-3xl font-black uppercase tracking-wider text-[#000000] text-center mb-1">
                                                {shopSettings?.shop_name || "SHAMIEDA BRIYANI HOUSE"}
                                            </h1>
                                            <p className="text-sm text-[#4b5563] font-medium tracking-wide uppercase">
                                                {shopSettings?.address || "No 70a Darulaman jaya 06000Jitra Kedah"}
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-end mb-8 border-b border-[#e5e7eb] pb-6">
                                            <div>
                                                <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-1">SLIP GAJI UNTUK</p>
                                                <h2 className="text-xl font-bold text-[#000000] uppercase">{selectedSlip.full_name}</h2>
                                                <p className="font-mono text-sm text-[#4b5563] mt-1">{selectedSlip.position || 'Staff'} • {selectedSlip.id.substring(0, 8).toUpperCase()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-1">TEMPOH BAYARAN</p>
                                                <h2 className="text-xl font-black text-[#000000] tracking-tight">{month}</h2>
                                                <p className="text-sm text-[#4b5563] mt-1 flex items-center justify-end gap-2">
                                                    <span className="font-bold">{selectedSlip.daysWorked}</span> Hari Bekerja
                                                </p>
                                            </div>
                                        </div>

                                        {/* Financials Grid - "Synching" Columns */}
                                        <div className="grid grid-cols-2 gap-12">
                                            {/* Left Column: Earnings */}
                                            <div className="flex flex-col">
                                                <h3 className="text-sm font-black uppercase tracking-widest border-b-2 border-[#22c55e] pb-2 mb-4 text-[#000000]">
                                                    PENDAPATAN
                                                </h3>
                                                <div className="space-y-3 flex-1">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-[#4b5563] font-medium">Gaji Asas</span>
                                                        <span className="font-mono font-bold">{(selectedSlip.dailyRate * selectedSlip.daysWorked).toFixed(2)}</span>
                                                    </div>
                                                    {selectedSlip.bonus > 0 && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-[#4b5563] font-medium">Bonus & Insentif</span>
                                                            <span className="font-mono font-bold">{selectedSlip.bonus.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-6 pt-2 border-t border-dashed border-[#d1d5db] flex justify-between items-center bg-[#f0fdf4] p-2 rounded">
                                                    <span className="text-xs font-black uppercase text-[#15803d]">Jumlah Pendapatan</span>
                                                    <span className="font-mono font-bold text-[#15803d]">RM {(selectedSlip.dailyRate * selectedSlip.daysWorked + selectedSlip.bonus).toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Right Column: Deductions */}
                                            <div className="flex flex-col">
                                                <h3 className="text-sm font-black uppercase tracking-widest border-b-2 border-[#ef4444] pb-2 mb-4 text-[#000000]">
                                                    POTONGAN
                                                </h3>
                                                <div className="space-y-3 flex-1">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-[#4b5563] font-medium">Penalti Lewat ({selectedSlip.lateCount}x)</span>
                                                        <span className={`font-mono font-bold ${selectedSlip.penalty > 0 ? 'text-[#ef4444]' : 'text-[#d1d5db]'}`}>
                                                            {selectedSlip.penalty.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-[#4b5563] font-medium">Advance</span>
                                                        <span className={`font-mono font-bold ${selectedSlip.advanceAmount > 0 ? 'text-[#ef4444]' : 'text-[#d1d5db]'}`}>
                                                            {selectedSlip.advanceAmount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    {selectedSlip.onboardingDeduction > 0 && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-[#4b5563] font-medium">Onboarding Kit</span>
                                                            <span className="font-mono font-bold text-[#ef4444]">{selectedSlip.onboardingDeduction.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-6 pt-2 border-t border-dashed border-[#d1d5db] flex justify-between items-center bg-[#fef2f2] p-2 rounded">
                                                    <span className="text-xs font-black uppercase text-[#b91c1c]">Jumlah Potongan</span>
                                                    <span className="font-mono font-bold text-[#b91c1c]">RM {(selectedSlip.penalty + selectedSlip.onboardingDeduction + selectedSlip.advanceAmount).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Section */}
                                    <div className="relative z-10 mt-auto pt-10">
                                        {/* Net Pay Box */}
                                        <div className="border-2 border-[#000000] bg-[#f9fafb] p-6 rounded-xl flex justify-between items-center mb-12">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6b7280] mb-1">GAJI BERSIH (NET PAY)</p>
                                                <p className="text-xs text-[#9ca3af] italic font-medium">Disahkan dan muktamad</p>
                                            </div>
                                            <p className="text-4xl font-black tracking-tight text-[#000000]">
                                                RM {selectedSlip.earnedSalary.toFixed(2)}
                                            </p>
                                        </div>

                                        {/* Signatures */}
                                        <div className="grid grid-cols-2 gap-20 mb-8">
                                            <div>
                                                <div className="h-24 border-b border-[#000000] mb-2"></div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-center text-[#6b7280]">Tandatangan Majikan</p>
                                            </div>
                                            <div>
                                                <div className="h-24 border-b border-[#000000] mb-2"></div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-center text-[#6b7280]">Tandatangan Pekerja</p>
                                                <p className="text-[9px] text-center text-[#9ca3af] mt-1">{selectedSlip.ic_number}</p>
                                            </div>
                                        </div>

                                        {/* System Meta */}
                                        <div className="text-center border-t border-[#f3f4f6] pt-4 flex justify-between items-center text-[9px] text-[#9ca3af] uppercase tracking-widest font-medium">
                                            <span>SHAMIEDA MANAGEMENT SYSTEM v1.0</span>
                                            <span>DOC ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                                            <span>{new Date().toLocaleString('ms-MY')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer (Hidden in Print) */}
                            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3 print:hidden shrink-0 pb-safe">
                                <button
                                    onClick={() => setSelectedSlip(null)}
                                    className="flex-1 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                                >
                                    Tutup
                                </button>
                                <button
                                    onClick={() => handleShareWhatsApp(selectedSlip)}
                                    disabled={generatingPdf}
                                    className="flex-1 py-3 rounded-xl font-bold bg-[#25D366] text-white hover:bg-[#20ba5a] transition-colors flex items-center justify-center gap-2"
                                >
                                    {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                                    Kongsi PDF
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="flex-1 py-3 rounded-xl font-bold bg-black text-white hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 hidden md:flex"
                                >
                                    <Printer className="w-4 h-4" />
                                    Cetak
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
            {/* Payment Modal */}
            {
                payingStaff && (
                    <PaymentModal
                        staff={payingStaff}
                        month={month}
                        onClose={() => setPayingStaff(null)}
                        onSuccess={() => fetchPayrollData()}
                    />
                )
            }

            {/* Proof Viewer */}
            {
                proofViewer && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl" onClick={() => setProofViewer(null)}>
                        <button onClick={() => setProofViewer(null)} className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white">
                            <X className="w-6 h-6" />
                        </button>
                        <div className="relative max-w-4xl w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                            <img
                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/staff-docs/${proofViewer}`}
                                alt="Bukti Bayaran"
                                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                            />
                            <a
                                href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/staff-docs/${proofViewer}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-6 right-6 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold shadow-lg"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Buka Penuh
                            </a>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
