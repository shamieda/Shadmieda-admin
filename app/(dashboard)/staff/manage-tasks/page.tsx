"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import TaskTemplatesTab from "@/components/settings/TaskTemplatesTab";
import { Loader2 } from "lucide-react";

export default function SupervisorManageTasksPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [newTemplate, setNewTemplate] = useState({
        title: "",
        description: "",
        position: "staff",
        deadline_time: "",
        penalty_amount: ""
    });

    useEffect(() => {
        fetchTemplates();
        fetchPositions();
    }, []);

    const fetchTemplates = async () => {
        try {
            const { data, error } = await supabase
                .from('task_templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const fetchPositions = async () => {
        try {
            const { data, error } = await supabase
                .from('positions')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setPositions(data || []);
        } catch (error) {
            console.error('Error fetching positions:', error);
        }
    };

    const handleTemplateChange = (field: keyof typeof newTemplate, value: string) => {
        setNewTemplate({ ...newTemplate, [field]: value });
    };

    const handleAdd = async () => {
        if (!newTemplate.title || !newTemplate.position) {
            alert("Sila isi tajuk dan pilih stesen.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('task_templates')
                .insert([{
                    title: newTemplate.title,
                    description: newTemplate.description,
                    position: newTemplate.position,
                    deadline_time: newTemplate.deadline_time || null,
                    penalty_amount: parseFloat(newTemplate.penalty_amount) || 0
                }]);

            if (error) throw error;

            setNewTemplate({
                title: "",
                description: "",
                position: "staff",
                deadline_time: "",
                penalty_amount: ""
            });

            await fetchTemplates();
            alert("Template tugasan berjaya ditambah!");
        } catch (error: any) {
            console.error('Error adding template:', error);
            alert("Gagal tambah template: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirmDeleteId === id) {
            setLoading(true);
            try {
                const { error } = await supabase
                    .from('task_templates')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                await fetchTemplates();
                setConfirmDeleteId(null);
                alert("Template berjaya dipadam!");
            } catch (error: any) {
                console.error('Error deleting template:', error);
                alert("Gagal padam template: " + error.message);
            } finally {
                setLoading(false);
            }
        } else {
            setConfirmDeleteId(id);
            setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    };

    const handleSyncAll = async () => {
        if (!confirm("Adakah anda pasti mahu sync semua tugasan kepada staff? Ini akan create tugasan baru untuk hari ini.")) {
            return;
        }

        setLoading(true);
        try {
            // Get all staff users
            const { data: staffUsers, error: staffError } = await supabase
                .from('users')
                .select('id, position')
                .in('role', ['staff', 'supervisor']);

            if (staffError) throw staffError;

            const today = new Date().toISOString().split('T')[0];

            // For each template, create tasks for matching staff
            for (const template of templates) {
                const matchingStaff = staffUsers?.filter(s =>
                    template.position === 'staff' || s.position === template.position
                );

                if (matchingStaff) {
                    for (const staff of matchingStaff) {
                        // Check if task already exists for today
                        const { data: existing } = await supabase
                            .from('tasks')
                            .select('id')
                            .eq('assigned_to', staff.id)
                            .eq('title', template.title)
                            .gte('created_at', `${today}T00:00:00`)
                            .lte('created_at', `${today}T23:59:59`)
                            .single();

                        if (!existing) {
                            await supabase
                                .from('tasks')
                                .insert([{
                                    title: template.title,
                                    description: template.description,
                                    position: template.position,
                                    assigned_to: staff.id,
                                    is_completed: false
                                }]);
                        }
                    }
                }
            }

            alert("Tugasan berjaya di-sync kepada semua staff!");
        } catch (error: any) {
            console.error('Error syncing tasks:', error);
            alert("Gagal sync tugasan: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Urus Tugasan</h1>
                <p className="text-gray-400 text-sm">Sebagai supervisor, anda boleh mengurus template tugasan untuk semua staff.</p>
            </div>

            {loading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface border border-white/10 rounded-xl p-6 flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-white font-medium">Memproses...</p>
                    </div>
                </div>
            )}

            <TaskTemplatesTab
                templates={templates}
                positions={positions}
                newTemplate={newTemplate}
                confirmDeleteId={confirmDeleteId}
                loading={loading}
                onTemplateChange={handleTemplateChange}
                onAdd={handleAdd}
                onDelete={handleDelete}
                onSyncAll={handleSyncAll}
            />
        </div>
    );
}
