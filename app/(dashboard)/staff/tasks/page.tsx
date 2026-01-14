"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, Circle, Camera, Loader2, Filter, RefreshCw, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function StaffTasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<{ id: string, position: string } | null>(null);
    const [selectedStation, setSelectedStation] = useState<string>("");
    const [allStations, setAllStations] = useState<string[]>([]);
    const [showFilter, setShowFilter] = useState(false);

    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const isGeneratingRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Initial load process
    useEffect(() => {
        const loadInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('users').select('id, position').eq('auth_id', user.id).single();
                if (profile) {
                    setUserProfile(profile);
                    const rawPosition = profile.position || "Semua Staff";
                    const station = rawPosition === 'Staff' ? 'Semua Staff' : rawPosition;
                    setSelectedStation(station);

                    // If coming from dashboard with ?sync=true, trigger sync immediately
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('sync') === 'true') {
                        await syncTasks(station);
                    }
                }
            }

            const { data: positions } = await supabase.from('positions').select('name');
            const stationList = new Set(['Semua Staff', ...(positions?.map((p: any) => p.name) || [])]);
            setAllStations(Array.from(stationList));
        };
        loadInitialData();
    }, []);

    // Polling & Realtime
    useEffect(() => {
        if (!userProfile) return;

        fetchTasks(selectedStation);
        const interval = setInterval(() => fetchTasks(selectedStation, true), 10000);

        // Subscription for Tasks (Insert/Update/Delete)
        const taskChannel = supabase
            .channel('tasks_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                fetchTasks(); // Reload tasks if someone else inserted them
            })
            .subscribe();

        // Subscription for TEMPLATES (New Feature -> Auto Sync)
        const templateChannel = supabase
            .channel('templates_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_templates' }, () => {
                // If a template is added/deleted, re-run SYNC to Generate/Remove tasks on the fly
                syncTasks();
            })
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(taskChannel);
            supabase.removeChannel(templateChannel);
        };
    }, [userProfile, selectedStation]);

    const syncTasks = async (station: string = selectedStation) => {
        if (!userProfile) return;
        setLoading(true);
        isGeneratingRef.current = true;

        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. CALL SERVER-SIDE GENERATOR (Fast & Accurate)
            const { error } = await supabase.rpc('generate_daily_tasks_for_user', {
                target_user_id: userProfile.id,
                user_pos: station // Pass the FILTERED station (or default)
            });

            if (error) throw error;

            // 2. Refetch to update UI
            await fetchTasks(station);

        } catch (err) {
            console.error("Sync error:", err);
            alert("Gagal sync: " + (err as any).message);
        } finally {
            isGeneratingRef.current = false;
            setLoading(false);
        }
    };
    const fetchTasks = async (station: string = selectedStation, isBackground = false) => {
        if (!userProfile) return;
        if (!isBackground) setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Fetch tasks assigned to ME and for the SELECTED station
            // Fetch tasks assigned to ME and for the SELECTED station
            let query = supabase
                .from('tasks')
                .select('*')
                .eq('assigned_to', userProfile.id)
                .gte('created_at', `${today}T00:00:00`);

            if (station === 'Semua Staff' || station === 'Staff') {
                // Match 'Staff' OR 'Semua Staff'
                query = query.or(`position.ilike.staff,position.ilike."Semua Staff"`);
            } else {
                // Match EXACTLY the selected station (e.g. 'Barista' only)
                query = query.ilike('position', station);
            }

            let { data: tasksData, error } = await query;

            if (error) throw error;

            // Auto-generate if empty (Smart Check for initial load)
            if ((!tasksData || tasksData.length === 0) && !isGeneratingRef.current && !isBackground) {
                await syncTasks(station);
                return;
            }

            setTasks(tasksData || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const toggleTask = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', id);
            if (error) throw error;
            setTasks(tasks.map((t: any) => t.id === id ? { ...t, is_completed: !currentStatus } : t));
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    // Old syncTasks removed


    const handleStationChange = (station: string) => {
        setSelectedStation(station);
        setShowFilter(false);
        syncTasks(station);
    };

    const startCamera = async () => {
        setIsCameraOpen(true);
        setCapturedImage(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            alert("Sila benarkan akses kamera.");
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach((t: any) => t.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);

                context.font = "bold 20px Arial";
                context.fillStyle = "yellow";
                const now = new Date();
                context.fillText(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 20, canvasRef.current.height - 20);

                setCapturedImage(canvasRef.current.toDataURL('image/jpeg'));
                stopCamera();
            }
        }
    };

    const handleSavePhoto = async () => {
        if (!capturedImage || !selectedTask) return;
        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const fileName = `${user?.id}_${selectedTask}_${Date.now()}.jpg`;
            const res = await fetch(capturedImage);
            const blob = await res.blob();
            await supabase.storage.from('task-proofs').upload(fileName, blob);
            const { data: { publicUrl } } = supabase.storage.from('task-proofs').getPublicUrl(fileName);
            await supabase.from('tasks').update({ proof_url: publicUrl, is_completed: true }).eq('id', selectedTask);

            // Notify
            const { getManagersAction, createNotificationAction } = await import("@/app/actions/notifications");
            const mgrs = await getManagersAction();
            if (mgrs.success && mgrs.managers) {
                const taskTitle = tasks.find((t: any) => t.id === selectedTask)?.title || "Tugasan";
                mgrs.managers.forEach((m: any) =>
                    createNotificationAction({
                        userId: m.id,
                        title: "Tugasan Selesai",
                        message: `${userProfile?.position} telah menyiapkan: ${taskTitle}`,
                        type: "success",
                        category: "task",
                        link: "/manager/operations"
                    })
                );
            }
            await fetchTasks(selectedStation);
            setSelectedTask(null);
            setCapturedImage(null);
        } catch (e: any) {
            alert("Gagal: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    const completedCount = tasks.filter((t: any) => t.is_completed).length;
    const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-white">Senarai Tugas</h1>
                            {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        </div>
                        <button
                            onClick={() => {
                                let defaultStation = userProfile?.position || 'Semua Staff';
                                if (defaultStation === 'Staff') defaultStation = 'Semua Staff';
                                setSelectedStation(defaultStation);
                                syncTasks(defaultStation);
                            }}
                            disabled={loading}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95"
                            title="Sync Tugasan"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-primary' : ''}`} />
                        </button>
                    </div>

                    {/* Station Pills - Horizontal Scroll */}
                    <div className="flex overflow-x-auto gap-2 py-2 no-scrollbar -mx-4 px-4 mask-fade-right">
                        {allStations.map((station: string) => (
                            <button
                                key={station}
                                onClick={() => handleStationChange(station)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border active:scale-95 ${selectedStation === station
                                        ? 'bg-primary border-primary text-black shadow-lg shadow-yellow-500/20'
                                        : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {station}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-white">{completedCount}/{tasks.length}</p>
                    <p className="text-xs text-gray-400">Siap</p>
                </div>
            </div>

            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center py-12 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs">Memuatkan tugasan...</p>
                    </div>
                ) : tasks.length > 0 ? (
                    tasks.map((task: any) => (
                        <div
                            key={task.id}
                            onClick={() => toggleTask(task.id, task.is_completed)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${task.is_completed ? 'bg-green-400/10 border-green-400/30' : 'bg-surface border-white/5 hover:border-primary/30'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    {task.is_completed ? <CheckCircle className="w-6 h-6 text-green-400" /> : <Circle className="w-6 h-6 text-gray-500 group-hover:text-primary" />}
                                </div>
                                <div>
                                    <p className={`font-medium leading-tight ${task.is_completed ? 'text-green-400 line-through' : 'text-white'}`}>{task.title}</p>
                                    {task.description && (
                                        <p className={`text-xs mt-1 ${task.is_completed ? 'text-green-400/70' : 'text-gray-400'}`}>{task.description}</p>
                                    )}
                                </div>
                            </div>
                            {!task.is_completed && (
                                <button onClick={(e) => { e.stopPropagation(); setSelectedTask(task.id); }} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white self-center">
                                    <Camera className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <Filter className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-20" />
                        <p className="text-gray-500 text-xs">Tiada tugasan untuk stesen ini.</p>
                    </div>
                )}
            </div>

            {selectedTask && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Ambil Bukti</h3>
                        <div className="aspect-video bg-black rounded-xl mb-4 relative overflow-hidden">
                            {isCameraOpen ? (
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            ) : capturedImage ? (
                                <img src={capturedImage} className="w-full h-full object-cover" />
                            ) : (
                                <div onClick={startCamera} className="w-full h-full flex items-center justify-center cursor-pointer text-gray-500">
                                    <Camera className="w-12 h-12" />
                                </div>
                            )}
                            {isCameraOpen && <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full border-4 border-gray-300" />}
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="flex gap-2">
                            <button onClick={() => { stopCamera(); setSelectedTask(null); setCapturedImage(null); }} className="flex-1 py-3 bg-white/5 rounded-lg text-white">Batal</button>
                            {capturedImage && <button onClick={handleSavePhoto} disabled={uploading} className="flex-1 py-3 bg-primary text-black font-bold rounded-lg">{uploading ? 'Simpan...' : 'Simpan'}</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
