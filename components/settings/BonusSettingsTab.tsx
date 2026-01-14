import { Plus, Trash2, Coins } from "lucide-react";

interface BonusConfig {
    id: string;
    name: string;
    value: number;
    requirement_type: string;
    requirement_value: string;
}

interface BonusSettingsTabProps {
    bonuses: BonusConfig[];
    newBonus: {
        name: string;
        value: string;
        requirement_type: string;
        requirement_value: string;
    };
    onBonusChange: (field: keyof BonusSettingsTabProps['newBonus'], value: string) => void;
    onAdd: () => void;
    onDelete: (id: string) => void;
}

export default function BonusSettingsTab({
    bonuses,
    newBonus,
    onBonusChange,
    onAdd,
    onDelete
}: BonusSettingsTabProps) {
    return (
        <div className="space-y-8">
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Bonus Configuration</h3>
                <p className="text-gray-400 text-sm mb-6">
                    Tetapkan bonus untuk staff berdasarkan kehadiran atau ranking.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Nama Bonus"
                        value={newBonus.name}
                        onChange={(e) => onBonusChange('name', e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                    />
                    <input
                        type="number"
                        placeholder="Nilai (RM)"
                        value={newBonus.value}
                        onChange={(e) => onBonusChange('value', e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                    />
                    <select
                        value={newBonus.requirement_type}
                        onChange={(e) => onBonusChange('requirement_type', e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                    >
                        <option value="attendance">Kehadiran</option>
                        <option value="ranking">Ranking</option>
                    </select>
                    <input
                        type="text"
                        placeholder={newBonus.requirement_type === 'attendance' ? 'Min. Hari' : 'Ranking (1-3)'}
                        value={newBonus.requirement_value}
                        onChange={(e) => onBonusChange('requirement_value', e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                    />
                    <button
                        onClick={onAdd}
                        className="bg-primary text-black font-bold rounded-lg hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah
                    </button>
                </div>

                <div className="space-y-2">
                    {bonuses.map((bonus) => (
                        <div key={bonus.id} className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <Coins className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">{bonus.name}</p>
                                    <p className="text-xs text-gray-400">
                                        RM{bonus.value} • {bonus.requirement_type === 'attendance' ? `Min ${bonus.requirement_value} hari` : `Ranking #${bonus.requirement_value}`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => onDelete(bonus.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {bonuses.length === 0 && (
                        <p className="text-center text-gray-500 italic py-4">Tiada bonus dikonfigurasi.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
