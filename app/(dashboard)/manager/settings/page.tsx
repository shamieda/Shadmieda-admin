"use client";

import { useState, useEffect } from "react";
import { Store, Coins, ClipboardList, Users, Package, Trash2, Bell, UserCog } from "lucide-react";
import dynamic from 'next/dynamic';
import { supabase } from "@/lib/supabase";
import { resetPayrollAction } from "@/app/actions/payroll";
import { showSuccess, showError, confirmAction } from "@/lib/notifications";
import {
    TaskTemplate,
    BonusConfig,
    Position,
    OnboardingItem,
    INITIAL_SHOP_SETTINGS,
    INITIAL_TEMPLATE,
    INITIAL_POSITION,
    INITIAL_ITEM
} from "@/types/settings";

// Lazy load tab components for better performance
const ShopSettingsTab = dynamic(() => import('@/components/settings/ShopSettingsTab'));
const BonusSettingsTab = dynamic(() => import('@/components/settings/BonusSettingsTab'));
const TaskTemplatesTab = dynamic(() => import('@/components/settings/TaskTemplatesTab'));
const StationsTab = dynamic(() => import('@/components/settings/StationsTab'));
const OnboardingKitTab = dynamic(() => import('@/components/settings/OnboardingKitTab'));
const StorageManagementTab = dynamic(() => import('@/components/settings/StorageManagementTab'));
const NotificationsTab = dynamic(() => import('@/components/settings/NotificationsTab'));
const AccountSettingsTab = dynamic(() => import('@/components/settings/AccountSettingsTab'));

type TabType = 'shop' | 'bonus' | 'tasks' | 'stations' | 'onboarding' | 'storage' | 'notifications' | 'account';

export default function ManagerSettingsPage() {
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('shop');

    // Shop Settings State
    const [settings, setSettings] = useState(INITIAL_SHOP_SETTINGS);

    // Task Templates State
    const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
    const [newTemplate, setNewTemplate] = useState(INITIAL_TEMPLATE);
    // Confirm Delete States
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmDeleteStationId, setConfirmDeleteStationId] = useState<string | null>(null);

    // Positions/Stations State
    const [positions, setPositions] = useState<Position[]>([]);
    const [newPosition, setNewPosition] = useState(INITIAL_POSITION);
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);

    // Onboarding Kit State
    const [onboardingKit, setOnboardingKit] = useState<OnboardingItem[]>([]);
    const [newItem, setNewItem] = useState(INITIAL_ITEM);

    const [userRole, setUserRole] = useState<string | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [showResetModal, setShowResetModal] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchUserRole();
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
            setCurrentUserEmail(user.email);
        }
    };

    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
            if (data) setUserRole(data.role);
        }
    };

    const fetchSettings = async () => {
        try {
            // Fetch Shop Settings
            const { data: shopData } = await supabase
                .from('shop_settings')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (shopData) {
                setSettings({
                    shop_name: shopData.shop_name || "",
                    address: shopData.address || "",
                    latitude: shopData.latitude || "3.1412",
                    longitude: shopData.longitude || "101.6865",
                    radius: shopData.radius?.toString() || "50",
                    attendance_bonus: shopData.attendance_bonus?.toString() || "0.00",
                    advanceLimit: shopData.advance_limit?.toString() || "500.00",
                    startTime: shopData.start_time || "09:00",
                    endTime: shopData.end_time || "18:00",
                    penalty15m: shopData.penalty_15m?.toString() || "0.00",
                    penalty30m: shopData.penalty_30m?.toString() || "0.00",
                    penaltyMax: shopData.penalty_max?.toString() || "0.00",
                    task_penalty_amount: shopData.task_penalty_amount?.toString() || "2.00",
                    ranking_reward_1: shopData.ranking_reward_1?.toString() || "100.00",
                    ranking_reward_2: shopData.ranking_reward_2?.toString() || "50.00",
                    ranking_reward_3: shopData.ranking_reward_3?.toString() || "25.00"
                });
            }

            // Fetch Task Templates
            const { data: templates } = await supabase.from('task_templates').select('*').order('created_at', { ascending: false });
            setTaskTemplates(templates || []);

            // Fetch Positions
            const { data: pos } = await supabase.from('positions').select('*').order('name');
            setPositions(pos || []);

            // Fetch Onboarding Kit
            const { data: kit } = await supabase.from('onboarding_kit').select('*').order('name');
            setOnboardingKit(kit || []);

        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    // Shop Settings Handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleLocationChange = (lat: number, lng: number) => {
        setSettings(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
        }));
    };

    const getCurrentLocation = () => {
        setLocationLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    handleLocationChange(position.coords.latitude, position.coords.longitude);
                    setLocationLoading(false);
                },
                () => {
                    showError("Gagal mengesan lokasi.");
                    setLocationLoading(false);
                }
            );
        } else {
            showError("Pelayar tidak menyokong geolokasi.");
            setLocationLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('shop_settings').upsert({
                shop_name: settings.shop_name,
                address: settings.address,
                latitude: parseFloat(settings.latitude),
                longitude: parseFloat(settings.longitude),
                radius: parseInt(settings.radius),
                attendance_bonus: parseFloat(settings.attendance_bonus),
                advance_limit: parseFloat(settings.advanceLimit),
                start_time: settings.startTime,
                end_time: settings.endTime,
                penalty_15m: parseFloat(settings.penalty15m),
                penalty_30m: parseFloat(settings.penalty30m),
                penalty_max: parseFloat(settings.penaltyMax),
                task_penalty_amount: parseFloat(settings.task_penalty_amount),
                ranking_reward_1: parseFloat(settings.ranking_reward_1),
                ranking_reward_2: parseFloat(settings.ranking_reward_2),
                ranking_reward_3: parseFloat(settings.ranking_reward_3)
            });

            if (error) throw error;
            showSuccess("Tetapan berjaya disimpan!");
        } catch (error: any) {
            showError(error);
        } finally {
            setLoading(false);
        }
    };

    // Account Handlers
    const handleUpdateEmail = async (email: string) => {
        if (!confirmAction("Adakah anda pasti mahu menukar emel? Anda perlu mengesahkan emel baru.")) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ email });
            if (error) throw error;
            showSuccess("Pautan pengesahan telah dihantar ke emel baru!");
        } catch (error: any) {
            showError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (password: string) => {
        if (!confirmAction("Adakah anda pasti mahu menukar kata laluan?")) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            showSuccess("Kata laluan berjaya ditukar!");
        } catch (error: any) {
            showError(error);
        } finally {
            setLoading(false);
        }
    };

    // Task Template Handlers
    // Task Template Handlers
    const handleAddTaskTemplate = async () => {
        if (!newTemplate.title) return showError("Sila isi tajuk tugasan");
        setLoading(true);
        try {
            const templateData = {
                position: newTemplate.position,
                title: newTemplate.title,
                description: newTemplate.description,
                deadline_time: newTemplate.deadline_time || null,
                penalty_amount: parseFloat(newTemplate.penalty_amount) || 0
            };

            const { data, error } = await supabase
                .from('task_templates')
                .insert([templateData])
                .select();

            if (error) throw error;

            const updatedTemplates = data ? [data[0], ...taskTemplates] : taskTemplates;
            if (data) setTaskTemplates(updatedTemplates); // Optimized: targeted update

            setNewTemplate(INITIAL_TEMPLATE);
            showSuccess("Template berjaya ditambah!");

            // Notify Staff about new task
            const { notifyStationStaffAction } = await import('@/app/actions/notifications');
            notifyStationStaffAction(newTemplate.position, newTemplate.title)
                .then(res => console.log("Notification sent:", res))
                .catch(err => console.error("Notification failed:", err));

            // Database Trigger handles sync automatically now.
        } catch (error: any) {
            showError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTaskTemplate = async (id: string) => {
        if (confirmDeleteId === id) {
            setLoading(true);
            try {
                const { error } = await supabase.from('task_templates').delete().eq('id', id);
                if (error) throw error;

                const updatedTemplates = taskTemplates.filter((t: any) => t.id !== id);
                setTaskTemplates(updatedTemplates);
                setConfirmDeleteId(null);
                showSuccess("Template berjaya dipadam!");

                // Database Trigger handles cleanup automatically now.
            } catch (error: any) {
                showError(error);
            } finally {
                setLoading(false);
            }
        } else {
            setConfirmDeleteId(id);
            setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    };

    const syncAllTasks = async (templatesOverride?: any[]) => {
        setLoading(true);
        const activeTemplates = templatesOverride || taskTemplates;
        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Get all staff
            const { data: users } = await supabase.from('users').select('id, position').eq('role', 'staff');
            if (!users) throw new Error("No staff found");

            // 2. Get existing tasks for today to avoid duplicates
            const { data: existingTasks } = await supabase
                .from('tasks')
                .select('id, assigned_to, title, is_completed')
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`);

            const existingSet = new Set(
                existingTasks?.map((t: any) => `${t.assigned_to}-${t.title}`) || []
            );

            const tasksToInsert: any[] = [];
            const tasksToDelete: string[] = [];

            for (const user of users) {
                const relevantTemplates = activeTemplates.filter((t: any) =>
                    t.position.trim().toLowerCase() === 'staff' ||
                    (t.position.trim().toLowerCase() === (user.position || '').trim().toLowerCase())
                );

                // Identify tasks to INSERT
                for (const template of relevantTemplates) {
                    if (!existingSet.has(`${user.id}-${template.title}`)) {
                        tasksToInsert.push({
                            assigned_to: user.id,
                            title: template.title,
                            description: template.description,
                            position: user.position || 'staff'
                        });
                    }
                }

                // Identify tasks to DELETE (Orphans)
                const userTasks = existingTasks?.filter((t: any) => t.assigned_to === user.id) || [];
                for (const task of userTasks) {
                    if (!task.is_completed) {
                        const hasTemplate = relevantTemplates.some(t => t.title === task.title);
                        if (!hasTemplate) {
                            tasksToDelete.push(task.id);
                        }
                    }
                }
            }

            // Execute Updates
            if (tasksToInsert.length > 0) {
                const { error } = await supabase.from('tasks').insert(tasksToInsert);
                if (error) throw error;
            }

            if (tasksToDelete.length > 0) {
                const { error } = await supabase.from('tasks').delete().in('id', tasksToDelete);
                if (error) throw error;
            }

            showSuccess("Sync selesai! Tugasan dikemaskini.");
        } catch (error: any) {
            showError(error);
        } finally {
            setLoading(false);
        }
    };

    // Position Handlers
    const handleAddPosition = async () => {
        if (!newPosition.name) return showError("Sila isi nama stesen");
        setLoading(true);
        try {
            const { data, error } = await supabase.from('positions').insert([newPosition]).select();
            if (error) throw error;
            if (data) setPositions([...positions, data[0]].sort((a, b) => a.name.localeCompare(b.name))); // Optimized: targeted update
            setNewPosition(INITIAL_POSITION);
            showSuccess("Stesen berjaya ditambah!");
        } catch (error: any) {
            showError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePosition = async () => {
        if (!editingPosition) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('positions').update({
                name: editingPosition.name,
                description: editingPosition.description
            }).eq('id', editingPosition.id);

            if (error) throw error;
            setPositions(positions.map((p: any) => p.id === editingPosition.id ? editingPosition : p)); // Optimized: targeted update
            setEditingPosition(null);
            showSuccess("Stesen berjaya dikemaskini!");
        } catch (error: any) {
            showError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePosition = async (id: string) => {
        if (confirmDeleteStationId === id) {
            setLoading(true);
            try {
                const { error } = await supabase.from('positions').delete().eq('id', id);
                if (error) throw error;
                setPositions(positions.filter((p: any) => p.id !== id));
                showSuccess("Stesen berjaya dipadam!");
                setConfirmDeleteStationId(null);
            } catch (error: any) {
                showError(error);
            } finally {
                setLoading(false);
            }
        } else {
            setConfirmDeleteStationId(id);
            setTimeout(() => setConfirmDeleteStationId(null), 3000); // Auto cancel after 3s
        }
    };

    // Onboarding Kit Handlers
    const handleAddItem = async () => {
        if (!newItem.name || !newItem.price) return showError("Sila isi semua maklumat");
        setLoading(true);
        try {
            const { data, error } = await supabase.from('onboarding_kit').insert([{
                name: newItem.name,
                price: parseFloat(newItem.price)
            }]).select();

            if (error) throw error;
            if (data) setOnboardingKit([...onboardingKit, data[0]].sort((a, b) => a.name.localeCompare(b.name))); // Optimized: targeted update
            setNewItem(INITIAL_ITEM);
            showSuccess("Item berjaya ditambah!");
        } catch (error: any) {
            showError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirmAction("Padam item ini?")) return;
        try {
            const { error } = await supabase.from('onboarding_kit').delete().eq('id', id);
            if (error) throw error;
            setOnboardingKit(onboardingKit.filter((i: any) => i.id !== id)); // Optimized: targeted update
        } catch (error: any) {
            showError(error);
        }
    };

    // Storage Cleanup Handler
    const handleCleanupPhotos = async () => {
        if (!confirmAction("Padam semua gambar selfie lebih dari 3 hari?")) return;
        setLoading(true);
        try {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const { data: oldRecords } = await supabase
                .from('attendance')
                .select('selfie_url')
                .lt('clock_in', threeDaysAgo.toISOString())
                .not('selfie_url', 'is', null);

            if (oldRecords && oldRecords.length > 0) {
                const filePaths = oldRecords
                    .map((r: any) => r.selfie_url?.split('/').pop())
                    .filter(Boolean);

                if (filePaths.length > 0) {
                    const { error: storageError } = await supabase.storage
                        .from('attendance-selfies')
                        .remove(filePaths as string[]);

                    if (storageError) throw storageError;

                    const { error: updateError } = await supabase
                        .from('attendance')
                        .update({ selfie_url: null })
                        .lt('clock_in', threeDaysAgo.toISOString());

                    if (updateError) throw updateError;
                }
                showSuccess(`${filePaths.length} gambar berjaya dipadam!`);
            } else {
                showSuccess("Tiada gambar lama untuk dipadam.");
            }
        } catch (error: any) {
            showError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleResetData = async () => {
        setLoading(true);
        setShowResetModal(false);
        try {
            const result = await resetPayrollAction();
            if (result.success) {
                showSuccess("Sistem telah dibersihkan sepenuhnya. Semua data testing telah dipadam!");
                fetchSettings(); // Refresh whatever might have changed
            } else {
                showError("Gagal memadam data: " + result.error);
            }
        } catch (error: any) {
            console.error('Error resetting data:', error);
            showError("Ralat sistem berlaku.");
        } finally {
            setLoading(false);
        }
    };

    if (userRole !== 'manager' && userRole !== 'admin' && userRole !== 'master') {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-400">Akses ditolak. Hanya Manager/Admin sahaja.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white">Tetapan Sistem</h1>
                <p className="text-gray-400 mt-1">Urus tetapan kedai, bonus, tugasan, dan lain-lain.</p>
            </header>

            {/* Tab Navigation */}
            <div className="bg-surface border border-white/5 rounded-xl p-2 flex gap-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('shop')}
                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'shop' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <Store className="w-4 h-4" />
                    KEDAI
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
                    DATA & STORAGE
                </button>
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'notifications' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <Bell className="w-4 h-4" />
                    NOTIFIKASI
                </button>
                <button
                    onClick={() => setActiveTab('account')}
                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'account' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                    <UserCog className="w-4 h-4" />
                    AKAUN
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'shop' && (
                <ShopSettingsTab
                    settings={settings}
                    loading={loading}
                    locationLoading={locationLoading}
                    onChange={handleChange}
                    onLocationChange={handleLocationChange}
                    onGetCurrentLocation={getCurrentLocation}
                    onSubmit={handleSubmit}
                />
            )}

            {activeTab === 'bonus' && (
                <BonusSettingsTab
                    settings={settings}
                    loading={loading}
                    onSettingsChange={handleChange}
                    onSaveSettings={handleSubmit}
                />
            )}

            {activeTab === 'tasks' && (
                <TaskTemplatesTab
                    templates={taskTemplates}
                    positions={positions}
                    newTemplate={newTemplate}
                    confirmDeleteId={confirmDeleteId}
                    loading={loading}
                    onTemplateChange={(field, value) => setNewTemplate({ ...newTemplate, [field]: value })}
                    onAdd={handleAddTaskTemplate}
                    onDelete={handleDeleteTaskTemplate}
                    onSyncAll={syncAllTasks}
                />
            )}

            {activeTab === 'stations' && (
                <StationsTab
                    positions={positions}
                    newPosition={newPosition}
                    editingPosition={editingPosition}
                    onPositionChange={(field, value) => setNewPosition({ ...newPosition, [field]: value })}
                    onEditChange={(field, value) => setEditingPosition({ ...editingPosition!, [field]: value })}
                    onAdd={handleAddPosition}
                    onEdit={(pos) => setEditingPosition(pos)}
                    onUpdate={handleUpdatePosition}
                    onCancelEdit={() => setEditingPosition(null)}
                    onDelete={handleDeletePosition}
                    confirmDeleteId={confirmDeleteStationId}
                />
            )}

            {activeTab === 'onboarding' && (
                <OnboardingKitTab
                    items={onboardingKit}
                    newItem={newItem}
                    onItemChange={(field, value) => setNewItem({ ...newItem, [field]: value })}
                    onAdd={handleAddItem}
                    onDelete={handleDeleteItem}
                />
            )}

            {activeTab === 'storage' && (
                <StorageManagementTab
                    loading={loading}
                    onCleanup={handleCleanupPhotos}
                    onResetData={() => setShowResetModal(true)}
                />
            )}

            {activeTab === 'notifications' && (
                <NotificationsTab
                    onSave={() => showSuccess("Tetapan notifikasi disimpan!")}
                />
            )}

            {activeTab === 'account' && (
                <AccountSettingsTab
                    loading={loading}
                    userEmail={currentUserEmail}
                    onUpdateEmail={handleUpdateEmail}
                    onUpdatePassword={handleUpdatePassword}
                />
            )}

            {/* Global Reset Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-surface border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">BERSIHKAN SISTEM?</h2>
                        <p className="text-gray-400 mb-6 text-sm text-center">
                            Adakah anda pasti? Tindakan ini akan memadam **SEMUA** rekod testing:
                            <br /><br />
                            • Permohonan Cuti (Leaves)<br />
                            • Kehadiran (Attendance)<br />
                            • Tugasan (Tasks)<br />
                            • Pinjaman (Advances)<br />
                            • Payroll & Notifikasi<br />
                            <br />
                            <strong className="text-red-400">Tindakan ini tidak boleh dipusing semula! Hanya gunakan jika anda bersedia untuk memulakan operasi sebenar.</strong>
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleResetData}
                                className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                                Ya, Bersihkan Semua
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
