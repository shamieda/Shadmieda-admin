import { Plus, Trash2, Package } from "lucide-react";

interface OnboardingItem {
    id: string;
    name: string;
    price: number;
}

interface OnboardingKitTabProps {
    items: OnboardingItem[];
    newItem: { name: string; price: string };
    onItemChange: (field: 'name' | 'price', value: string) => void;
    onAdd: () => void;
    onDelete: (id: string) => void;
}

export default function OnboardingKitTab({
    items,
    newItem,
    onItemChange,
    onAdd,
    onDelete
}: OnboardingKitTabProps) {
    return (
        <div className="space-y-8">
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Onboarding Kit</h3>
                <p className="text-gray-400 text-sm mb-6">
                    Item yang akan diberikan kepada staff baru. Harga akan ditolak dari gaji bulan pertama.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Nama Item (cth: Baju Uniform)"
                        value={newItem.name}
                        onChange={(e) => onItemChange('name', e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                    />
                    <input
                        type="number"
                        placeholder="Harga (RM)"
                        value={newItem.price}
                        onChange={(e) => onItemChange('price', e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                    />
                    <button
                        onClick={onAdd}
                        className="bg-primary text-black font-bold rounded-lg hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Item
                    </button>
                </div>

                <div className="space-y-2">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <Package className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">{item.name}</p>
                                    <p className="text-xs text-gray-400">RM {item.price}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onDelete(item.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <p className="text-center text-gray-500 italic py-4">Tiada item dalam onboarding kit.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
