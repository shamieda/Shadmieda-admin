"use client";

import { DollarSign, Users, Activity, TrendingUp, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Owner Dashboard</h1>
                    <p className="text-gray-400">Selamat datang, Tuan Shamieda.</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-400 text-sm font-bold">System Online</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Revenue */}
                <div className="bg-surface border border-white/5 p-6 rounded-2xl hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-yellow-500/10 rounded-xl group-hover:bg-yellow-500/20 transition-colors">
                            <DollarSign className="w-6 h-6 text-primary" />
                        </div>
                        <span className="text-green-400 text-xs font-bold flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> +12%
                        </span>
                    </div>
                    <h3 className="text-gray-400 text-sm font-medium">Jumlah Jualan (Bulan Ini)</h3>
                    <p className="text-3xl font-bold text-white mt-1">RM 45,231.00</p>
                </div>

                {/* Total Staff */}
                <div className="bg-surface border border-white/5 p-6 rounded-2xl hover:border-blue-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <h3 className="text-gray-400 text-sm font-medium">Jumlah Staff Aktif</h3>
                    <p className="text-3xl font-bold text-white mt-1">12 <span className="text-sm text-gray-500 font-normal">/ 15</span></p>
                </div>

                {/* System Health */}
                <div className="bg-surface border border-white/5 p-6 rounded-2xl hover:border-purple-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                            <Activity className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                    <h3 className="text-gray-400 text-sm font-medium">Status Langganan</h3>
                    <p className="text-3xl font-bold text-white mt-1">Aktif</p>
                    <p className="text-xs text-gray-500 mt-1">Next Bill: 15 Feb 2026</p>
                </div>
            </div>

            {/* Recent Alerts / Issues */}
            <div className="bg-surface border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Isu Perlu Perhatian
                </h3>
                <div className="space-y-4">
                    {[
                        { id: 1, title: "Staff 'Ali Bin Abu' lewat 3 hari berturut-turut", time: "2 jam lepas", severity: "medium" },
                        { id: 2, title: "Stok 'Beras Basmathi' kritikal (< 10kg)", time: "5 jam lepas", severity: "high" },
                        { id: 3, title: "Bayaran Gaji Bulan Oktober belum disahkan", time: "1 hari lepas", severity: "low" },
                    ].map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${alert.severity === 'high' ? 'bg-red-500' :
                                        alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`} />
                                <div>
                                    <p className="text-white font-medium">{alert.title}</p>
                                    <p className="text-xs text-gray-500">{alert.time}</p>
                                </div>
                            </div>
                            <button className="text-xs font-bold text-primary hover:text-white transition-colors">
                                Lihat
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
