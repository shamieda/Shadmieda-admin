"use client";

import AttendanceHistory from "@/components/AttendanceHistory";

export default function StaffAttendanceHistoryPage() {
    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white">Rekod Kehadiran</h1>
                <p className="text-gray-400 text-sm">Lihat sejarah kehadiran anda.</p>
            </div>

            <AttendanceHistory />
        </div>
    );
}
