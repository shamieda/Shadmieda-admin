import { Plus, Trash2, ClipboardList, RefreshCw } from "lucide-react";

interface TaskTemplate {
    id: string;
    title: string;
    description: string;
    position: string;
    deadline_time?: string;
    penalty_amount: number;
}

interface Position {
    id: string;
    name: string;
}

interface TaskTemplatesTabProps {
    templates: TaskTemplate[];
    positions: Position[];
    newTemplate: {
        title: string;
        description: string;
        position: string;
        deadline_time: string;
        penalty_amount: string;
    };
    confirmDeleteId: string | null;
    loading: boolean;
    onTemplateChange: (field: keyof TaskTemplatesTabProps['newTemplate'], value: string) => void;
    onAdd: () => void;
    onDelete: (id: string) => void;
    onSyncAll: () => void;
}

export default function TaskTemplatesTab({
    templates,
    positions,
    newTemplate,
    confirmDeleteId,
    loading,
    onTemplateChange,
    onAdd,
    onDelete,
    onSyncAll
}: TaskTemplatesTabProps) {
    return (
        <div className="space-y-8">
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Template Tugasan Harian</h3>
                    <button
                        onClick={onSyncAll}
                        disabled={loading || templates.length === 0}
                        className="bg-blue-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Sync Semua Tugasan
                    </button>
                </div>
                <p className="text-gray-400 text-sm mb-6">
                    Buat template tugasan yang akan auto-sync kepada staff setiap hari.
                </p>

                <div className="space-y-4 mb-6">
                    <input
                        type="text"
                        placeholder="Tajuk Tugasan (cth: Bersihkan Meja)"
                        value={newTemplate.title}
                        onChange={(e) => onTemplateChange('title', e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                            value={newTemplate.position}
                            onChange={(e) => onTemplateChange('position', e.target.value)}
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
                        onChange={(e) => onTemplateChange('description', e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary h-24"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Deadline (Masa)</label>
                            <input
                                type="time"
                                value={newTemplate.deadline_time}
                                onChange={(e) => onTemplateChange('deadline_time', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Penalti Jika Gagal (RM)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={newTemplate.penalty_amount}
                                onChange={(e) => onTemplateChange('penalty_amount', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                    <button
                        onClick={onAdd}
                        disabled={loading}
                        className="w-full bg-white/10 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        TAMBAH TEMPLATE
                    </button>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Senarai Template Tugasan</h3>
                </div>
                {templates.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">Tiada template tugasan.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {templates.map((template) => (
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
                                    onClick={() => onDelete(template.id)}
                                    className={`p-2 transition-all ${confirmDeleteId === template.id
                                        ? "text-red-500 bg-red-500/10 rounded opacity-100 animate-pulse font-bold text-xs"
                                        : "text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                        }`}
                                >
                                    {confirmDeleteId === template.id ? (
                                        "PADAM?"
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
