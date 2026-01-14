import { Plus, Trash2, Edit2, MapPin } from "lucide-react";

interface Position {
    id: string;
    name: string;
    description?: string;
}

interface StationsTabProps {
    positions: Position[];
    newPosition: { name: string; description: string };
    editingPosition: Position | null;
    onPositionChange: (field: 'name' | 'description', value: string) => void;
    onEditChange: (field: 'name' | 'description', value: string) => void;
    onAdd: () => void;
    onEdit: (position: Position) => void;
    onUpdate: () => void;
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    confirmDeleteId: string | null;
}

export default function StationsTab({
    positions,
    newPosition,
    editingPosition,
    onPositionChange,
    onEditChange,
    onAdd,
    onEdit,
    onUpdate,
    onCancelEdit,
    onDelete,
    confirmDeleteId
}: StationsTabProps) {
    return (
        <div className="space-y-8">
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Stesen / Posisi Kerja</h3>
                <p className="text-gray-400 text-sm mb-6">
                    Tetapkan stesen kerja untuk staff. Contoh: Barista, Cashier, Kitchen, etc.
                </p>

                {!editingPosition ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <input
                            type="text"
                            placeholder="Nama Stesen (cth: Barista)"
                            value={newPosition.name}
                            onChange={(e) => onPositionChange('name', e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                        />
                        <input
                            type="text"
                            placeholder="Penerangan (optional)"
                            value={newPosition.description}
                            onChange={(e) => onPositionChange('description', e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                        />
                        <button
                            onClick={onAdd}
                            className="bg-primary text-black font-bold rounded-lg hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Stesen
                        </button>
                    </div>
                ) : (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                        <h4 className="text-blue-400 font-bold mb-4">Edit Stesen</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                type="text"
                                placeholder="Nama Stesen"
                                value={editingPosition.name}
                                onChange={(e) => onEditChange('name', e.target.value)}
                                className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                            <input
                                type="text"
                                placeholder="Penerangan"
                                value={editingPosition.description || ''}
                                onChange={(e) => onEditChange('description', e.target.value)}
                                className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={onUpdate}
                                    className="flex-1 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-all"
                                >
                                    Simpan
                                </button>
                                <button
                                    onClick={onCancelEdit}
                                    className="flex-1 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-all"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {positions.map((pos) => (
                        <div key={pos.id} className="bg-black/50 p-4 rounded-lg border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">{pos.name}</p>
                                    {pos.description && (
                                        <p className="text-xs text-gray-400">{pos.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onEdit(pos)}
                                    className="text-gray-500 hover:text-blue-400 transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onDelete(pos.id)}
                                    className={`p-1 transition-all flex items-center gap-1 ${confirmDeleteId === pos.id
                                        ? "text-red-500 bg-red-500/10 rounded px-2 opacity-100 animate-pulse font-bold text-xs"
                                        : "text-gray-500 hover:text-red-400"
                                        }`}
                                >
                                    {confirmDeleteId === pos.id ? (
                                        "PADAM?"
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                    {positions.length === 0 && (
                        <p className="text-center text-gray-500 italic py-4 col-span-2">Tiada stesen dijumpai.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
