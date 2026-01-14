import { Save, Store, MapPin, Coins } from "lucide-react";
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-64 bg-black/50 rounded-lg animate-pulse" />
});

interface ShopSettings {
    shop_name: string;
    address: string;
    latitude: string;
    longitude: string;
    radius: string;
    attendance_bonus: string;
    advanceLimit: string;
    startTime: string;
    endTime: string;
    penalty15m: string;
    penalty30m: string;
    penaltyMax: string;
}

interface ShopSettingsTabProps {
    settings: ShopSettings;
    loading: boolean;
    locationLoading: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onLocationChange: (lat: number, lng: number) => void;
    onGetCurrentLocation: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

export default function ShopSettingsTab({
    settings,
    loading,
    locationLoading,
    onChange,
    onLocationChange,
    onGetCurrentLocation,
    onSubmit
}: ShopSettingsTabProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-8">
            {/* Shop Info */}
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" />
                    Maklumat Kedai
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Nama Kedai</label>
                        <input
                            type="text"
                            name="shop_name"
                            value={settings.shop_name}
                            onChange={onChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Alamat</label>
                        <input
                            type="text"
                            name="address"
                            value={settings.address}
                            onChange={onChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Location */}
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Lokasi Premis
                    </h3>
                    <button
                        type="button"
                        onClick={onGetCurrentLocation}
                        disabled={locationLoading}
                        className="text-xs bg-primary/10 text-primary px-3 py-1 rounded hover:bg-primary/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                        {locationLoading ? <span className="animate-spin">⌛</span> : <MapPin className="w-3 h-3" />}
                        {locationLoading ? "Mengesan..." : "Detect Location"}
                    </button>
                </div>
                <LocationPicker
                    latitude={parseFloat(settings.latitude)}
                    longitude={parseFloat(settings.longitude)}
                    onLocationChange={onLocationChange}
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
                            name="radius"
                            value={settings.radius}
                            onChange={onChange}
                            className="bg-transparent text-white font-mono text-sm w-full focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Advance Limit */}
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
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
                                name="advanceLimit"
                                value={settings.advanceLimit}
                                onChange={onChange}
                                className="bg-transparent border-none text-white w-full focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Working Hours */}
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
                <h3 className="text-sm font-bold text-white mb-4">Waktu Operasi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Waktu Masuk (Start Time)</label>
                        <input
                            type="time"
                            name="startTime"
                            value={settings.startTime}
                            onChange={onChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Waktu Balik (End Time)</label>
                        <input
                            type="time"
                            name="endTime"
                            value={settings.endTime}
                            onChange={onChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Late Penalties */}
            <div className="bg-black/30 p-6 rounded-xl border border-white/5">
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
                                name="penalty15m"
                                value={settings.penalty15m}
                                onChange={onChange}
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
                                name="penalty30m"
                                value={settings.penalty30m}
                                onChange={onChange}
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
                                name="penaltyMax"
                                value={settings.penaltyMax}
                                onChange={onChange}
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
    );
}
