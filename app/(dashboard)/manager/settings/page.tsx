"use client";

import { useState, useEffect } from "react";
import { MapPin, Save, Store, Coins, ClipboardList, Plus, Trash2, Users, FileText, Package, RefreshCw } from "lucide-react";
import dynamic from 'next/dynamic';
import { supabase } from "@/lib/supabase";

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-white/5 animate-pulse rounded-xl flex items-center justify-center text-gray-500">Loading Map...</div>
});

export default function ManagerSettingsPage() {
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'shop' | 'bonus' | 'tasks' | 'stations' | 'onboarding' | 'storage'>('shop');

    const [settings, setSettings] = useState({
        shopName: "Shamieda Briyani House",
        address: "No 12, Jalan Kebun, Shah Alam",
        latitude: "3.1412",
        longitude: "101.6865",
        radius: "50",
        attendanceBonus: "0.00",
        dailyReward: "0.00",
        weeklyReward: "0.00",
        monthlyReward: "0.00",
        salaryRewardPct: "0.00",
        startTime: "09:00:00",
        endTime: "18:00:00",
        latePenaltyPerMinute: "0.00",
        penalty15m: "0.00",
        penalty30m: "0.00",
        penaltyMax: "0.00",
        advanceLimit: "500.00"
    });

    const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
    const [newTemplate, setNewTemplate] = useState({
        position: "staff",
        title: "",
        description: "",
        deadline_time: "",
        penalty_amount: "0.00"
    });

    const [bonusConfigs, setBonusConfigs] = useState<any[]>([]);
    const [newBonus, setNewBonus] = useState({
        name: "",
        type: "fixed",
        value: "0.00",
        requirement_type: "general",
        requirement_value: "0"
    });

    const [positions, setPositions] = useState<any[]>([]);
    const [newPosition, setNewPosition] = useState("");
    const [editingPosition, setEditingPosition] = useState<{ id: string, name: string } | null>(null);

    const [onboardingKit, setOnboardingKit] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({ name: "", price: "" });

    const [userRole, setUserRole] = useState<string | null>(null);

    // Load settings from Supabase
    useEffect(() => {
        fetchSettings();
        fetchUserRole();
    }, []);

    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('users')
                .select('role')
                .eq('auth_id', user.id)
                .single();
            if (data) setUserRole(data.role);
        }
    };

    const fetchSettings = async () => {
        try {
            // Fetch Shop Settings
            const { data: shopData, error: shopError } = await supabase
                .from('shop_settings')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (shopError && shopError.code !== 'PGRST116') throw shopError;

            if (shopData) {
                setSettings({
                    shopName: shopData.shop_name,
                    address: shopData.address,
                    latitude: shopData.latitude.toString(),
                    longitude: shopData.longitude.toString(),
                    radius: shopData.radius.toString(),
                    attendanceBonus: (shopData.attendance_bonus || 0).toFixed(2),
                    dailyReward: (shopData.daily_reward || 0).toFixed(2),
                    weeklyReward: (shopData.weekly_reward || 0).toFixed(2),
                    monthlyReward: (shopData.monthly_reward || 0).toFixed(2),
                    salaryRewardPct: (shopData.salary_reward_pct || 0).toFixed(2),
                    startTime: shopData.start_time || "09:00:00",
                    endTime: shopData.end_time || "18:00:00",
                    latePenaltyPerMinute: (shopData.late_penalty_per_minute || 0).toFixed(2),
                    penalty15m: (shopData.penalty_15m || 0).toFixed(2),
                    penalty30m: (shopData.penalty_30m || 0).toFixed(2),
                    penaltyMax: (shopData.penalty_max || 0).toFixed(2),
                    advanceLimit: (shopData.advance_limit || 500).toFixed(2)
                });
                setOnboardingKit(shopData.onboarding_kit_config || []);
            }

            // Fetch Task Templates
            const { data: templatesData, error: templatesError } = await supabase
                .from('task_templates')
                .select('*')
                .order('created_at', { ascending: true });

            if (templatesError) throw templatesError;
            setTaskTemplates(templatesData || []);

            // Fetch Bonus Configs
            const { data: bonusData, error: bonusError } = await supabase
                .from('bonus_configs')
                .select('*')
                .order('created_at', { ascending: true });

            if (bonusError) throw bonusError;
            setBonusConfigs(bonusData || []);

            // Fetch Positions
            const { data: positionsData, error: positionsError } = await supabase
                .from('positions')
                .select('*')
                .order('name', { ascending: true });

            if (positionsError) throw positionsError;
            setPositions(positionsData || []);

        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const handleAddTaskTemplate = async () => {
        if (!newTemplate.title) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('task_templates')
                .insert([{
                    ...newTemplate,
                    penalty_amount: parseFloat(newTemplate.penalty_amount),
                    deadline_time: newTemplate.deadline_time || null
                }]);
            if (error) throw error;
            setNewTemplate({
                position: "staff",
                title: "",
                description: "",
                deadline_time: "",
                penalty_amount: "0.00"
            });
            fetchSettings();
        } catch (error: any) {
            alert(`Gagal menambah template: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const syncAllTasks = async () => {
        console.log("SYNC DEBUG: Button Clicked! Starting function."); // First thing!

        // Use window.confirm explicitly
        if (!window.confirm("Adakah anda pasti mahu mengemaskini tugasan hari ini untuk SEMUA staff mengikut template terbaru? Tugasan yang sudah siap tidak akan dipadam.")) {
            console.log("SYNC DEBUG: User cancelled confirm dialog.");
            return;
        }

        setLoading(true);
        console.log("SYNC DEBUG: User accepted. Proceeding...");

        try {
            // Get Local Date (YYYY-MM-DD) correctly
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const localDate = new Date(now.getTime() - offset);
            const today = localDate.toISOString().split('T')[0];
            console.log("SYNC DEBUG: Date for sync:", today);

            // 1. Fetch all templates
            const { data: templates, error: templatesError } = await supabase.from('task_templates').select('*');
            if (templatesError) throw templatesError;
            console.log("SYNC DEBUG: Templates found:", templates?.length);

            // 2. Fetch all staff
            const { data: staff, error: staffError } = await supabase.from('users').select('id, full_name, position, role').eq('role', 'staff');
            if (staffError) throw staffError;
            console.log("SYNC DEBUG: Staff found:", staff?.length);

            if (!templates || templates.length === 0) {
                alert("Tiada template tugasan dijumpai. Sila tambah template dahulu.");
                setLoading(false);
                return;
            }

            if (!staff || staff.length === 0) {
                alert("Tiada staff dijumpai.");
                setLoading(false);
                return;
            }

            let updatedCount = 0;

            for (const member of staff) {
                console.log(`SYNC DEBUG: Processing staff: ${member.full_name} (${member.position})`);

                // Fetch member's tasks for today
                const { data: currentTasks, error: tasksError } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('assigned_to', member.id)
                    .gte('created_at', `${today}T00:00:00`);

                if (tasksError) {
                    console.error("SYNC DEBUG: Error fetching tasks for member:", member.id, tasksError);
                    continue;
                }

                console.log(`SYNC DEBUG: Current tasks for ${member.full_name}:`, currentTasks?.length);

                const memberTemplates = templates.filter(t =>
                    (t.position?.toLowerCase() === member.position?.toLowerCase()) ||
                    t.position === 'staff' ||
                    t.position === 'Semua Staff'
                );

                console.log(`SYNC DEBUG: Matching templates for ${member.full_name}:`, memberTemplates.length);

                // Find tasks to delete (extraneous ones not in template, excluding completed)
                const tasksToDelete = (currentTasks || []).filter(ct =>
                    !ct.is_completed && !memberTemplates.some(t => t.title === ct.title)
                );

                // Find templates to add (missing ones)
                const templatesToAdd = memberTemplates.filter(t =>
                    !(currentTasks || []).some(ct => ct.title === t.title)
                );

                console.log(`SYNC DEBUG: ${member.full_name} -> To Delete: ${tasksToDelete.length}, To Add: ${templatesToAdd.length}`);

                if (tasksToDelete.length > 0) {
                    const { error: deleteError } = await supabase.from('tasks').delete().in('id', tasksToDelete.map(t => t.id));
                    if (deleteError) console.error("SYNC DEBUG: Delete error", deleteError);
                }

                if (templatesToAdd.length > 0) {
                    const newTasks = templatesToAdd.map(t => ({
                        title: t.title,
                        description: t.description,
                        position: t.position,
                        assigned_to: member.id,
                        is_completed: false,
                        created_at: new Date().toISOString()
                    }));

                    const { error: insertError } = await supabase.from('tasks').insert(newTasks);
                    if (insertError) {
                        console.error("SYNC DEBUG: Insert error", insertError);
                        throw insertError;
                    }

                    updatedCount++;

                    // Send notification to staff member
                    try {
                        const { createNotificationAction } = await import('@/app/actions/notifications');
                        await createNotificationAction({
                            userId: member.id,
                            title: "Tugasan Baru",
                            message: `${templatesToAdd.length} tugasan baru telah sentiasa diset semula untuk hari ini.`,
                            type: "info",
                            category: "task",
                            link: "/staff/tasks" // Assuming this is where detailed task list is
                        });
                    } catch (notifError) {
                        console.error("SYNC DEBUG: Notification error", notifError);
                    }
                }
            }
            alert(`Selesai! Tugasan dikemaskini untuk ${updatedCount} staff.`);
        } catch (error: any) {
            console.error("Error syncing all tasks:", error);
            alert(`Gagal mengemaskini tugasan: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTaskTemplate = async (id: string) => {
        if (!confirm("Padam template ini?")) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('task_templates')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchSettings();
        } catch (error: any) {
            alert(`Gagal memadam template: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBonus = async () => {
        if (!newBonus.name) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('bonus_configs')
                .insert([{
                    ...newBonus,
                    value: parseFloat(newBonus.value),
                    requirement_value: parseInt(newBonus.requirement_value)
                }]);
            if (error) throw error;
            setNewBonus({
                name: "",
                type: "fixed",
                value: "0.00",
                requirement_type: "general",
                requirement_value: "0"
            });
            fetchSettings();
        } catch (error: any) {
            alert(`Gagal menambah bonus: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBonus = async (id: string) => {
        if (!confirm("Padam bonus ini?")) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('bonus_configs')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchSettings();
        } catch (error: any) {
            alert(`Gagal memadam bonus: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPosition = async () => {
        if (!newPosition) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('positions')
                .insert([{ name: newPosition }]);
            if (error) throw error;
            setNewPosition("");
            fetchSettings();
        } catch (error: any) {
            if (error.message.includes("row-level security")) {
                alert("Akses Ditolak: Anda bukan Manager. Sila klik butang 'Fix Permissions' di sebelah butang Tambah.");
            } else {
                alert(`Gagal menambah stesen: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };



    const handleDeletePosition = async (id: string) => {
        if (!confirm("Padam stesen ini?")) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('positions')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchSettings();
        } catch (error: any) {
            alert(`Gagal memadam stesen: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePosition = async () => {
        if (!editingPosition || !editingPosition.name) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('positions')
                .update({ name: editingPosition.name })
                .eq('id', editingPosition.id);
            if (error) throw error;
            setEditingPosition(null);
            fetchSettings();
        } catch (error: any) {
            alert(`Gagal mengemaskini stesen: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        if (!newItem.name || !newItem.price) return;
        const updatedKit = [...onboardingKit, { ...newItem, id: crypto.randomUUID(), price: parseFloat(newItem.price) }];
        setOnboardingKit(updatedKit);
        setNewItem({ name: "", price: "" });
    };

    const handleDeleteItem = (id: string) => {
        const updatedKit = onboardingKit.filter(item => item.id !== id);
        setOnboardingKit(updatedKit);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const getCurrentLocation = () => {
        setLocationLoading(true);
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            setLocationLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setSettings(prev => ({
                    ...prev,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6)
                }));
                setLocationLoading(false);
            },
            (error) => {
                alert("Unable to retrieve location. Please enable GPS.");
                setLocationLoading(false);
            }
        );
    };

    const handleCleanupPhotos = async () => {
        if (!confirm("Adakah anda pasti mahu memadam gambar selfie lama (lebih 3 hari)? Tindakan ini tidak boleh dikembalikan.")) return;
        setLoading(true);
        try {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            // 1. Get old records with photos
            const { data: oldRecords, error: fetchError } = await supabase
                .from('attendance')
                .select('id, selfie_url')
                .lt('clock_in', threeDaysAgo.toISOString())
                .not('selfie_url', 'is', null);

            if (fetchError) throw fetchError;

            if (!oldRecords || oldRecords.length === 0) {
                alert("Tiada gambar lama untuk dipadam.");
                setLoading(false);
                return;
            }

            let deletedCount = 0;
            const updates = [];

            // 2. Delete from Storage and Prepare DB Updates
            for (const record of oldRecords) {
                if (record.selfie_url && !record.selfie_url.includes('placehold.co') && !record.selfie_url.includes('via.placeholder.com')) {
                    try {
                        // Extract filename from URL
                        const urlParts = record.selfie_url.split('/');
                        const fileName = urlParts[urlParts.length - 1];

                        if (fileName) {
                            const { error: deleteError } = await supabase.storage
                                .from('attendance-selfies')
                                .remove([fileName]);

                            if (!deleteError) {
                                deletedCount++;
                            }
                        }
                    } catch (err) {
                        console.error("Error deleting file:", err);
                    }
                }

                updates.push(
                    supabase
                        .from('attendance')
                        .update({ selfie_url: null })
                        .eq('id', record.id)
                );
            }

            // 3. Execute DB Updates
            await Promise.all(updates);

            alert(`Pembersihan selesai! ${deletedCount} gambar telah dipadam dari storage.`);

        } catch (error: any) {
            console.error("Cleanup error:", error);
            alert(`Gagal membersihkan storage: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Always INSERT a new row (Append-only log)
            const { error } = await supabase
                .from('shop_settings')
                .insert([{
                    shop_name: settings.shopName,
                    address: settings.address,
                    latitude: parseFloat(settings.latitude),
                    longitude: parseFloat(settings.longitude),
                    radius: parseInt(settings.radius),
                    attendance_bonus: parseFloat(settings.attendanceBonus),
                    daily_reward: parseFloat(settings.dailyReward),
                    weekly_reward: parseFloat(settings.weeklyReward),
                    monthly_reward: parseFloat(settings.monthlyReward),
                    salary_reward_pct: parseFloat(settings.salaryRewardPct),
                    start_time: settings.startTime,
                    end_time: settings.endTime,
                    late_penalty_per_minute: parseFloat(settings.latePenaltyPerMinute),
                    penalty_15m: parseFloat(settings.penalty15m),
                    penalty_30m: parseFloat(settings.penalty30m),
                    penalty_max: parseFloat(settings.penaltyMax),
                    advance_limit: parseFloat(settings.advanceLimit),
                    onboarding_kit_config: onboardingKit
                }]);

            if (error) throw error;

            // Also save to localStorage as backup/cache
            localStorage.setItem("shopSettings", JSON.stringify(settings));

            alert("Tetapan berjaya disimpan!");
            fetchSettings();
        } catch (error: any) {
            console.error('Error saving settings:', error);
            alert(`Gagal menyimpan tetapan: ${error.message || "Ralat tidak diketahui"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Tetapan Kedai</h1>
                    <p className="text-gray-400 text-sm">Konfigurasi lokasi, bonus dan tugasan.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-1 scrollbar-hide">
                <button
                    onClick={() => setActiveTab('shop')}
                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'shop' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <Store className="w-4 h-4" />
                    LOKASI & KEDAI
                </button>
                <button
                    onClick={() => setActiveTab('bonus')}
                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'bonus' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <Coins className="w-4 h-4" />
                    BONUS
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'tasks' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <ClipboardList className="w-4 h-4" />
                    TUGASAN
                </button>
                <button
                    onClick={() => setActiveTab('stations')}
                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'stations' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <Users className="w-4 h-4" />
                    STESEN
                </button>
                <button
                    onClick={() => setActiveTab('onboarding')}
                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'onboarding' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <Package className="w-4 h-4" />
                    ONBOARDING
                </button>
                <button
                    onClick={() => setActiveTab('storage')}
                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'storage' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <Trash2 className="w-4 h-4" />
                    STORAGE
                </button>
            </div>

            {/* Content */}
            <div className="bg-surface border border-white/5 rounded-xl p-6">
                {activeTab === 'shop' && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Nama Kedai</label>
                                <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-4 py-3">
                                    <Store className="w-5 h-5 text-gray-500 mr-3" />
                                    <input
                                        type="text"
                                        value={settings.shopName}
                                        onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                                        className="bg-transparent border-none text-white w-full focus:outline-none"
                                        placeholder="Nama Kedai"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Alamat</label>
                                <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-4 py-3">
                                    <MapPin className="w-5 h-5 text-gray-500 mr-3" />
                                    <input
                                        type="text"
                                        value={settings.address}
                                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                        className="bg-transparent border-none text-white w-full focus:outline-none"
                                        placeholder="Alamat Kedai"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location Picker */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-400 uppercase">Lokasi GPS</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLocationLoading(true);
                                        if (navigator.geolocation) {
                                            navigator.geolocation.getCurrentPosition(
                                                (position) => {
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        latitude: position.coords.latitude.toFixed(6),
                                                        longitude: position.coords.longitude.toFixed(6)
                                                    }));
                                                    setLocationLoading(false);
                                                },
                                                (error) => {
                                                    console.error("Error detecting location:", error);
                                                    alert("Gagal mengesan lokasi. Sila pastikan anda membenarkan akses lokasi.");
                                                    setLocationLoading(false);
                                                }
                                            );
                                        } else {
                                            alert("Pelayar anda tidak menyokong geolokasi.");
                                            setLocationLoading(false);
                                        }
                                    }}
                                    disabled={locationLoading}
                                    className="text-xs bg-primary/10 text-primary px-3 py-1 rounded hover:bg-primary/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                    {locationLoading ? (
                                        <span className="animate-spin">⌛</span>
                                    ) : (
                                        <MapPin className="w-3 h-3" />
                                    )}
                                    {locationLoading ? "Mengesan..." : "Detect Location"}
                                </button>
                            </div>
                            <LocationPicker
                                latitude={parseFloat(settings.latitude)}
                                longitude={parseFloat(settings.longitude)}
                                onLocationChange={(lat, lng) => {
                                    setSettings(prev => ({
                                        ...prev,
                                        latitude: lat.toFixed(6),
                                        longitude: lng.toFixed(6)
                                    }));
                                }}
                            />
                            <div className="grid grid-cols-3 gap-4 mt-2">
                                <div className="bg-black/50 p-3 rounded-lg border border-white/10">
                                    <span className="text-xs text-gray-500 block">Latitude</span>
                                    <span className="font-mono text-sm text-white">{parseFloat(settings.latitude).toFixed(6)}</span>
                                </div>
                                <div className="bg-black/50 p-3 rounded-lg border border-white/10">
                                    <span className="text-xs text-gray-500 block">Longitude</span>
                                    <span className="font-mono text-sm text-white">{parseFloat(settings.longitude).toFixed(6)}</span>
                                </div>
                                <div className="bg-black/50 p-3 rounded-lg border border-white/10">
                                    <span className="text-xs text-gray-500 block">Radius (Meter)</span>
                                    <input
                                        type="number"
                                        value={settings.radius}
                                        onChange={(e) => setSettings({ ...settings, radius: e.target.value })}
                                        className="bg-transparent text-white font-mono text-sm w-full focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Advance Limit */}
                        <div className="pt-4 border-t border-white/5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Coins className="w-4 h-4 text-primary" />
                                Had Kelayakan Advance
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Had Maksimum (RM)</label>
                                    <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-4 py-3">
                                        <span className="text-gray-500 mr-2">RM</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={settings.advanceLimit}
                                            onChange={(e) => setSettings({ ...settings, advanceLimit: e.target.value })}
                                            className="bg-transparent border-none text-white w-full focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                                <p className="text-xs text-primary/80">
                                    <strong>Nota:</strong> Ini adalah jumlah maksimum yang boleh dipohon oleh staff melalui aplikasi mereka.
                                </p>
                            </div>
                        </div>

                        {/* Working Hours */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Waktu Masuk (Start Time)</label>
                                <input
                                    type="time"
                                    value={settings.startTime}
                                    onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Waktu Balik (End Time)</label>
                                <input
                                    type="time"
                                    value={settings.endTime}
                                    onChange={(e) => setSettings({ ...settings, endTime: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        {/* Late Penalties */}
                        <div className="pt-4 border-t border-white/5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Coins className="w-4 h-4 text-red-400" />
                                Penalti Lewat (Tiered)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">1 - 15 Minit</label>
                                    <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-4 py-3">
                                        <span className="text-gray-500 mr-2">RM</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={settings.penalty15m}
                                            onChange={(e) => setSettings({ ...settings, penalty15m: e.target.value })}
                                            className="bg-transparent border-none text-white w-full focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">16 - 30 Minit</label>
                                    <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-4 py-3">
                                        <span className="text-gray-500 mr-2">RM</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={settings.penalty30m}
                                            onChange={(e) => setSettings({ ...settings, penalty30m: e.target.value })}
                                            className="bg-transparent border-none text-white w-full focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Lebih 30 Minit (Max)</label>
                                    <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-4 py-3">
                                        <span className="text-gray-500 mr-2">RM</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={settings.penaltyMax}
                                            onChange={(e) => setSettings({ ...settings, penaltyMax: e.target.value })}
                                            className="bg-transparent border-none text-white w-full focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <p className="text-xs text-yellow-200">
                                    <strong>Nota:</strong> Jika lewat kurang 1 minit, tiada penalti. Jika lewat lebih 30 minit, penalti maksimum akan dikenakan.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? "Menyimpan..." : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        SIMPAN TETAPAN
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'bonus' && (
                    <div className="space-y-8">
                        {/* Bonus Configs */}
                        <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-4">Tambah Bonus Baru</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input
                                    type="text"
                                    placeholder="Nama Bonus (Contoh: Bonus Rajin)"
                                    value={newBonus.name}
                                    onChange={(e) => setNewBonus({ ...newBonus, name: e.target.value })}
                                    className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                />
                                <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-4 py-3">
                                    <span className="text-gray-500 mr-2">RM</span>
                                    <input
                                        type="number"
                                        placeholder="Nilai"
                                        value={newBonus.value}
                                        onChange={(e) => setNewBonus({ ...newBonus, value: e.target.value })}
                                        className="bg-transparent border-none text-white w-full focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <select
                                    value={newBonus.type}
                                    onChange={(e) => setNewBonus({ ...newBonus, type: e.target.value })}
                                    className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                >
                                    <option value="fixed">Tetap (Fixed)</option>
                                    <option value="percentage">Peratus (%)</option>
                                </select>
                                <select
                                    value={newBonus.requirement_type}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewBonus({
                                            ...newBonus,
                                            requirement_type: val,
                                            requirement_value: val === 'ranking' ? '1' : '0'
                                        });
                                    }}
                                    className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                >
                                    <option value="general">Umum (Semua Staff)</option>
                                    <option value="attendance_days">Kehadiran Penuh (Hari)</option>
                                    <option value="punctuality">Ketepatan Masa (Punctuality)</option>
                                    <option value="ranking">Ranking (Top 3)</option>
                                </select>
                                {newBonus.requirement_type === 'ranking' ? (
                                    <select
                                        value={newBonus.requirement_value}
                                        onChange={(e) => setNewBonus({ ...newBonus, requirement_value: e.target.value })}
                                        className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                    >
                                        <option value="1">Tempat Pertama (No. 1)</option>
                                        <option value="2">Tempat Kedua (No. 2)</option>
                                        <option value="3">Tempat Ketiga (No. 3)</option>
                                    </select>
                                ) : (
                                    <input
                                        type="number"
                                        placeholder="Syarat (Contoh: 26 hari)"
                                        value={newBonus.requirement_value}
                                        onChange={(e) => setNewBonus({ ...newBonus, requirement_value: e.target.value })}
                                        className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                    />
                                )}
                            </div>
                            <button
                                onClick={handleAddBonus}
                                disabled={loading}
                                className="w-full bg-white/10 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                TAMBAH BONUS
                            </button>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white">Senarai Bonus Aktif</h3>
                            {bonusConfigs.length === 0 ? (
                                <p className="text-gray-500 text-sm italic">Tiada bonus dikonfigurasi.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {bonusConfigs.map((bonus) => (
                                        <div key={bonus.id} className="bg-black/30 p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:border-primary/30 transition-colors">
                                            <div>
                                                <h4 className="font-bold text-white">{bonus.name}</h4>
                                                <p className="text-xs text-gray-400">
                                                    {bonus.type === 'fixed' ? `RM${bonus.value}` : `${bonus.value}%`} •
                                                    {bonus.requirement_type === 'general' ? ' Semua Staff' :
                                                        bonus.requirement_type === 'attendance_days' ? ` Min ${bonus.requirement_value} Hari` :
                                                            bonus.requirement_type === 'punctuality' ? ' Ketepatan Masa' :
                                                                bonus.requirement_type === 'ranking' ? ` Ranking No. ${bonus.requirement_value}` : ` Syarat: ${bonus.requirement_type}`}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteBonus(bonus.id)}
                                                className="text-gray-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'tasks' && (
                    <div className="space-y-8">
                        {/* Task Templates */}
                        <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-4">Tambah Template Tugasan</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input
                                    type="text"
                                    placeholder="Tajuk Tugasan"
                                    value={newTemplate.title}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                    className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                />
                                <select
                                    value={newTemplate.position}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, position: e.target.value })}
                                    className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary capitalize"
                                >
                                    {positions.map(p => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                    <option value="staff">Semua Staff</option>
                                </select>
                            </div>
                            <textarea
                                placeholder="Deskripsi Tugasan..."
                                value={newTemplate.description}
                                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary mb-4 h-24"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Deadline (Masa)</label>
                                    <input
                                        type="time"
                                        value={newTemplate.deadline_time}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, deadline_time: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Penalti Jika Gagal (RM)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={newTemplate.penalty_amount}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, penalty_amount: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddTaskTemplate}
                                disabled={loading}
                                className="w-full bg-white/10 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                TAMBAH TEMPLATE
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">Senarai Template Tugasan</h3>
                                <button
                                    onClick={syncAllTasks}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all text-xs font-bold"
                                >
                                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                                    SYNC TUGASAN HARI INI
                                </button>
                            </div>
                            {taskTemplates.length === 0 ? (
                                <p className="text-gray-500 text-sm italic">Tiada template tugasan.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {taskTemplates.map((template) => (
                                        <div key={template.id} className="bg-black/30 p-4 rounded-xl border border-white/5 flex justify-between items-start group hover:border-primary/30 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                                        {template.position}
                                                    </span>
                                                    <h4 className="font-bold text-white">{template.title}</h4>
                                                </div>
                                                <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                                                <div className="flex gap-4 text-xs text-gray-500">
                                                    <span>Deadline: {template.deadline_time || '-'}</span>
                                                    <span>Penalti: RM{template.penalty_amount}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteTaskTemplate(template.id)}
                                                className="text-gray-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'stations' && (
                    <div className="space-y-8">
                        <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-4">Pengurusan Stesen / Posisi Staff</h3>
                            <div className="flex gap-4 mb-6">
                                <input
                                    type="text"
                                    placeholder="Nama Stesen Baru (Contoh: Supervisor)"
                                    value={newPosition}
                                    onChange={(e) => setNewPosition(e.target.value)}
                                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAddPosition}
                                        disabled={loading || !newPosition}
                                        className="bg-primary text-black font-bold px-6 rounded-lg hover:bg-yellow-400 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Plus className="w-4 h-4" />
                                        TAMBAH
                                    </button>

                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {positions.map((pos) => (
                                    <div key={pos.id} className="bg-black/50 p-4 rounded-lg border border-white/5 flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                                <Users className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <span className="text-white font-medium capitalize">{pos.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeletePosition(pos.id)}
                                            className="text-gray-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'onboarding' && (
                    <div className="space-y-8">
                        <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-4">Onboarding Kit (Potongan Gaji)</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Item ini akan ditolak dari gaji pertama staff jika mereka memilihnya semasa pendaftaran.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <input
                                    type="text"
                                    placeholder="Nama Item (Contoh: Uniform)"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                                />
                                <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-4 py-3">
                                    <span className="text-gray-500 mr-2">RM</span>
                                    <input
                                        type="number"
                                        placeholder="Harga"
                                        value={newItem.price}
                                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                        className="bg-transparent border-none text-white w-full focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handleAddItem}
                                    disabled={!newItem.name || !newItem.price}
                                    className="bg-white/10 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                    TAMBAH ITEM
                                </button>
                            </div>

                            <div className="space-y-3">
                                {onboardingKit.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between bg-black/50 p-4 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Package className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{item.name}</p>
                                                <p className="text-xs text-gray-400">RM {item.price}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {onboardingKit.length === 0 && (
                                    <p className="text-center text-gray-500 italic py-4">Tiada item dalam onboarding kit.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'storage' && (
                    <div className="space-y-8">
                        <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-4">Pengurusan Storage</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Urus penggunaan ruang simpanan dengan memadam gambar selfie lama.
                            </p>

                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                                        <Trash2 className="w-5 h-5" />
                                        Pembersihan Automatik
                                    </h4>
                                    <p className="text-gray-400 text-sm max-w-md">
                                        Padam semua gambar selfie kehadiran yang berusia lebih dari <strong>3 hari</strong>.
                                        Rekod kehadiran akan kekal, tetapi gambar akan dipadam untuk menjimatkan ruang.
                                    </p>
                                </div>
                                <button
                                    onClick={handleCleanupPhotos}
                                    disabled={loading}
                                    className="bg-red-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 whitespace-nowrap"
                                >
                                    {loading ? "Sedang Memproses..." : "BERSIHKAN STORAGE SEKARANG"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
}
