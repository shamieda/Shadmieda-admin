"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, Circle, Camera, Loader2, Filter, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function StaffTasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userPosition, setUserPosition] = useState<string>("");
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const isGeneratingRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Get user profile for position
                const { data: profile } = await supabase
                    .from('users')
                    .select('id, position')
                    .eq('auth_id', user.id)
                    .single();

                if (profile) {
                    setUserPosition(profile.position || "Staff");

                    // Fetch tasks for this position created today
                    const today = new Date().toISOString().split('T')[0];
                    let { data: tasksData, error } = await supabase
                        .from('tasks')
                        .select('*')
                        .eq('assigned_to', profile.id)
                        .in('position', [profile.position, 'staff'])
                        .gte('created_at', `${today}T00:00:00`);

                    if (error) throw error;

                    // If no tasks found, try to generate from templates
                    if ((!tasksData || tasksData.length === 0) && !isGeneratingRef.current) {
                        isGeneratingRef.current = true; // Lock generation
                        console.log("No tasks found. Generating from templates...");
                        const { data: templates } = await supabase
                            .from('task_templates')
                            .select('*')
                            .or(`position.ilike.${profile.position},position.eq.staff`);

                        if (templates && templates.length > 0) {
                            const newTasks = templates.map(t => ({
                                title: t.title,
                                description: t.description,
                                position: t.position,
                                assigned_to: profile.id,
                                is_completed: false,
                                created_at: new Date().toISOString()
                            }));

                            const { error: insertError } = await supabase
                                .from('tasks')
                                .insert(newTasks);

                            if (insertError) {
                                console.error("Error generating tasks:", insertError);
                                isGeneratingRef.current = false; // Unlock on error
                            } else {
                                // Refetch tasks after generation
                                const { data: refreshedTasks } = await supabase
                                    .from('tasks')
                                    .select('*')
                                    .eq('assigned_to', profile.id)
                                    .in('position', [profile.position, 'staff'])
                                    .gte('created_at', `${today}T00:00:00`);

                                tasksData = refreshedTasks;
                            }
                        } else {
                            isGeneratingRef.current = false; // Unlock if no templates
                        }
                    }

                    setTasks(tasksData || []);
                }
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTask = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ is_completed: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const completedCount = tasks.filter(t => t.is_completed).length;
    const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    const syncTasks = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('id, position')
                .eq('auth_id', user.id)
                .single();

            if (!profile) return;

            const today = new Date().toISOString().split('T')[0];

            // 1. Fetch current templates
            const { data: templates } = await supabase
                .from('task_templates')
                .select('*')
                .or(`position.ilike.${profile.position},position.eq.staff`);

            // 2. Fetch today's tasks
            const { data: currentTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('assigned_to', profile.id)
                .gte('created_at', `${today}T00:00:00`);

            if (!templates) return;

            const tasksToDelete = (currentTasks || []).filter(ct =>
                !ct.is_completed && !templates.some(t => t.title === ct.title)
            );

            const templatesToAdd = templates.filter(t =>
                !(currentTasks || []).some(ct => ct.title === t.title)
            );

            // 3. Delete outdated uncompleted tasks
            if (tasksToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('tasks')
                    .delete()
                    .in('id', tasksToDelete.map(t => t.id));

                if (deleteError) throw deleteError;
            }

            // 4. Add new tasks from templates
            if (templatesToAdd.length > 0) {
                const newTasks = templatesToAdd.map(t => ({
                    title: t.title,
                    description: t.description,
                    position: t.position,
                    assigned_to: profile.id,
                    is_completed: false,
                    created_at: new Date().toISOString()
                }));

                const { error: insertError } = await supabase.from('tasks').insert(newTasks);
                if (insertError) throw insertError;
            }

            await fetchTasks();
            alert("Tugasan telah dikemaskini mengikut template terbaru!");
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        setIsCameraOpen(true);
        setCapturedImage(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            alert("Akses kamera ditolak. Sila benarkan akses kamera untuk mengambil bukti.");
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
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

                // Add Watermark
                context.font = "bold 20px Arial";
                context.fillStyle = "yellow";
                const now = new Date();
                const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
                const dateStr = now.toLocaleDateString('en-GB');
                context.fillText(`${dateStr} ${timeStr}`, 20, canvasRef.current.height - 20);

                const imageData = canvasRef.current.toDataURL('image/jpeg');
                setCapturedImage(imageData);
                stopCamera();
            }
        }
    };

    const handleSavePhoto = async () => {
        if (!capturedImage || !selectedTask) return;

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            // Convert base64 to blob
            const response = await fetch(capturedImage);
            const blob = await response.blob();

            const fileName = `${user.id}_${selectedTask}_${Date.now()}.jpg`;
            const filePath = `${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('task-proofs')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('task-proofs')
                .getPublicUrl(filePath);

            // 3. Update Task Record
            const { error: updateError } = await supabase
                .from('tasks')
                .update({
                    proof_url: publicUrl,
                    is_completed: true
                })
                .eq('id', selectedTask);

            if (updateError) throw updateError;

            await fetchTasks();
            setSelectedTask(null);
            setCapturedImage(null);
            alert("Bukti telah berjaya dimuat naik!");

            // Notify Managers
            try {
                const { getManagersAction, createNotificationAction } = await import("@/app/actions/notifications");
                const managersResult = await getManagersAction();
                if (managersResult.success && managersResult.managers) {
                    const taskTitle = tasks.find(t => t.id === selectedTask)?.title || "Tugasan";
                    for (const manager of managersResult.managers) {
                        await createNotificationAction({
                            userId: manager.id,
                            title: "Tugasan Selesai",
                            message: `${userPosition} telah menyiapkan tugasan: ${taskTitle}`,
                            type: "success",
                            category: "task",
                            link: "/manager/operations"
                        });
                    }
                }
            } catch (notifError) {
                console.error("Error sending notification:", notifError);
            }
        } catch (error: any) {
            console.error("Error uploading proof:", error);
            alert(`Gagal memuat naik bukti: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Senarai Tugas</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-gray-400 text-sm">Stesen: <span className="text-primary font-bold">{userPosition}</span></p>
                        <button
                            onClick={fetchTasks}
                            disabled={loading}
                            className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
                            title="Refresh Senarai"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={syncTasks}
                            disabled={loading}
                            className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-primary transition-colors"
                            title="Sync dengan Template (Reset)"
                        >
                            <Filter className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-white">{completedCount}/{tasks.length}</p>
                    <p className="text-xs text-gray-400">Siap</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Task List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center py-12 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs">Memuatkan tugasan...</p>
                    </div>
                ) : tasks.length > 0 ? (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            onClick={() => toggleTask(task.id, task.is_completed)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${task.is_completed
                                ? 'bg-green-400/10 border-green-400/30'
                                : 'bg-surface border-white/5 hover:border-primary/30'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {task.is_completed ? (
                                    <CheckCircle className="w-6 h-6 text-green-400" />
                                ) : (
                                    <Circle className="w-6 h-6 text-gray-500 group-hover:text-primary" />
                                )}
                                <span className={`font-medium ${task.is_completed ? 'text-green-400 line-through' : 'text-white'}`}>
                                    {task.title}
                                </span>
                            </div>

                            {!task.is_completed && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTask(task.id);
                                    }}
                                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <Filter className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-20" />
                        <p className="text-gray-500 text-xs">Tiada tugasan untuk hari ini.</p>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Ambil Bukti Gambar</h3>

                        <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-6 border border-white/10">
                            {isCameraOpen ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={capturePhoto}
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full border-4 border-gray-300 shadow-lg flex items-center justify-center"
                                    >
                                        <div className="w-8 h-8 bg-white rounded-full border-2 border-black" />
                                    </button>
                                </>
                            ) : capturedImage ? (
                                <img
                                    src={capturedImage}
                                    className="w-full h-full object-cover"
                                    alt="Captured"
                                />
                            ) : (
                                <div
                                    onClick={startCamera}
                                    className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer"
                                >
                                    <Camera className="w-12 h-12 mb-2" />
                                    <span className="text-sm font-bold">BUKA KAMERA</span>
                                </div>
                            )}
                        </div>

                        <canvas ref={canvasRef} className="hidden" />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    stopCamera();
                                    setSelectedTask(null);
                                    setCapturedImage(null);
                                }}
                                disabled={uploading}
                                className="flex-1 py-3 rounded-lg bg-white/5 text-white font-medium hover:bg-white/10 disabled:opacity-50"
                            >
                                Batal
                            </button>
                            {capturedImage ? (
                                <button
                                    onClick={handleSavePhoto}
                                    disabled={uploading}
                                    className="flex-1 py-3 rounded-lg bg-primary text-black font-bold hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            SIMPAN...
                                        </>
                                    ) : (
                                        'SIMPAN'
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={startCamera}
                                    className="flex-1 py-3 rounded-lg bg-primary/20 text-primary font-bold hover:bg-primary/30"
                                >
                                    AMBIL GAMBAR
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
