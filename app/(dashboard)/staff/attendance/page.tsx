"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, MapPin, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AttendanceHistory from "@/components/AttendanceHistory";
import { createNotificationAction, getManagersAction } from "@/app/actions/notifications";

// Mock Shop Coordinates (Replace with real ones later)
// Mock Shop Coordinates (Replace with real ones later)
const SHOP_LAT = 6.2620; // Updated to User's location for testing
const SHOP_LNG = 100.4438;
const MAX_DISTANCE_METERS = 500; // Increased radius for testing
const USE_DEBUG_LOCATION = true; // Set to true to ignore DB settings and use hardcoded coords

export default function StaffAttendancePage() {
    const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [maxDistance, setMaxDistance] = useState(MAX_DISTANCE_METERS);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasClockedIn, setHasClockedIn] = useState(false);
    const [showDebug, setShowDebug] = useState(false); // Default to false

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [userName, setUserName] = useState<string>("Staff");

    // 1. Get Location & Shop Settings
    useEffect(() => {
        getLocation();
        fetchUserProfile();
        checkTodayAttendance();
    }, []);

    const checkTodayAttendance = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('auth_id', user.id)
                    .single();

                if (profile) {
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const todayEnd = new Date();
                    todayEnd.setHours(23, 59, 59, 999);

                    const { data } = await supabase
                        .from('attendance')
                        .select('id')
                        .eq('user_id', profile.id)
                        .gte('clock_in', todayStart.toISOString())
                        .lte('clock_in', todayEnd.toISOString())
                        .maybeSingle();

                    if (data) {
                        setHasClockedIn(true);
                    }
                }
            }
        } catch (error) {
            console.error("Error checking attendance:", error);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('users')
                    .select('full_name')
                    .eq('auth_id', user.id)
                    .single();

                if (data) setUserName(data.full_name);
            }
        } catch (err) {
            console.error("Error fetching user profile", err);
        }
    };

    const getLocation = async () => {
        setLoading(true);

        // Fetch settings from Supabase
        let shopLat = SHOP_LAT;
        let shopLng = SHOP_LNG;
        let newMaxDist = MAX_DISTANCE_METERS;

        if (USE_DEBUG_LOCATION) {
            console.log("DEBUG Mode: Using hardcoded location settings");
            shopLat = SHOP_LAT;
            shopLng = SHOP_LNG;
            newMaxDist = MAX_DISTANCE_METERS;
        } else {
            try {
                const { data, error } = await supabase
                    .from('shop_settings')
                    .select('*')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single();

                if (data) {
                    shopLat = data.latitude;
                    shopLng = data.longitude;
                    newMaxDist = data.radius;

                    // Update local storage as cache
                    localStorage.setItem("shopSettings", JSON.stringify({
                        latitude: data.latitude,
                        longitude: data.longitude,
                        radius: data.radius
                    }));
                }
            } catch (err) {
                console.error("Error fetching settings, using defaults/cache", err);
                // Fallback to cache
                const savedSettings = localStorage.getItem("shopSettings");
                if (savedSettings) {
                    const parsed = JSON.parse(savedSettings);
                    shopLat = parseFloat(parsed.latitude);
                    shopLng = parseFloat(parsed.longitude);
                    newMaxDist = parseInt(parsed.radius);
                }
            }
        }

        setMaxDistance(newMaxDist);

        if (USE_DEBUG_LOCATION) {
            // Mock the USER location to be exactly at the shop (or very close)
            console.log("DEBUG Mode: Mocking User Location to match Shop");
            const mockUserLat = SHOP_LAT; // + 0.0001; // Optional offset if you want to test distance
            const mockUserLng = SHOP_LNG;

            setLocation({
                latitude: mockUserLat,
                longitude: mockUserLng,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null
            } as any);

            const dist = calculateDistance(
                mockUserLat,
                mockUserLng,
                shopLat,
                shopLng
            );
            setDistance(dist);
            setLoading(false);
            return; // Exit early, don't use real GPS
        }

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation(position.coords);
                const dist = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    shopLat,
                    shopLng
                );
                setDistance(dist);
                setLoading(false);
            },
            (err) => {
                setError("Unable to retrieve your location. Please enable GPS.");
                setLoading(false);
            }
        );
    };

    // Haversine Formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // 2. Camera Logic
    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setError("Camera access denied.");
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                // Draw video frame
                context.drawImage(videoRef.current, 0, 0, 640, 480);

                // Add Watermark
                context.font = "bold 24px Arial";
                context.fillStyle = "yellow";
                context.shadowColor = "black";
                context.shadowBlur = 5;

                const now = new Date();
                const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
                const dateStr = now.toLocaleDateString('en-GB');

                context.fillText(`${userName}`, 20, 400);
                context.fillText(`${dateStr}, ${timeStr}`, 20, 430);
                context.fillText(`Lat: ${location?.latitude.toFixed(4)}, Lng: ${location?.longitude.toFixed(4)}`, 20, 460);

                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
                setIsCameraOpen(false);

                // Stop stream
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach((track: any) => track.stop());
            }
        }
    };

    // 3. Submit Attendance
    const handleClockIn = async () => {
        if (!location || !capturedImage) return;
        setLoading(true);

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            console.log("Clock-In Auth Check:", { user, authError });

            if (authError) {
                console.error("Auth Error Details:", authError);
                throw new Error("Ralat pengesahan: " + authError.message);
            }
            if (!user) throw new Error("Sesi tamat. Sila log masuk semula.");

            // 1. Get Profile
            const { data: profile } = await supabase
                .from('users')
                .select('id')
                .eq('auth_id', user.id)
                .single();

            if (!profile) throw new Error("Profil tidak dijumpai.");

            // 2. Get Shop Settings
            const { data: shopSettings } = await supabase
                .from('shop_settings')
                .select('start_time, late_penalty_per_minute, penalty_15m, penalty_30m, penalty_max')
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            const now = new Date();
            let status = 'present';
            let penalty = 0;

            if (shopSettings && shopSettings.start_time) {
                const [startH, startM, startS] = shopSettings.start_time.split(':').map(Number);
                const startTimeDate = new Date();
                startTimeDate.setHours(startH, startM, startS || 0, 0);

                if (now > startTimeDate) {
                    status = 'late';
                    const diffMs = now.getTime() - startTimeDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);

                    if (diffMins > 0) {
                        // Tiered Penalty Logic
                        if (shopSettings.penalty_max > 0 && diffMins > 30) {
                            penalty = shopSettings.penalty_max;
                        } else if (shopSettings.penalty_30m > 0 && diffMins > 15) {
                            penalty = shopSettings.penalty_30m;
                        } else if (shopSettings.penalty_15m > 0 && diffMins > 0) {
                            penalty = shopSettings.penalty_15m;
                        } else {
                            // Fallback to per-minute
                            penalty = diffMins * (shopSettings.late_penalty_per_minute || 0);
                        }
                    }
                }
            }

            // 2.5 Check if already clocked in today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const { data: existingAttendance } = await supabase
                .from('attendance')
                .select('id')
                .eq('user_id', profile.id)
                .gte('clock_in', todayStart.toISOString())
                .lte('clock_in', todayEnd.toISOString())
                .single();

            if (existingAttendance) {
                throw new Error("Anda sudah clock-in hari ini. Jumpa lagi esok!");
            }

            // 3. Upload Image to Supabase Storage
            let selfieUrl = "";
            try {
                const response = await fetch(capturedImage);
                const blob = await response.blob();
                const fileExt = 'jpg';
                const fileName = `${user.id}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('attendance-selfies')
                    .upload(filePath, blob, {
                        contentType: 'image/jpeg',
                        upsert: false
                    });

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    // Fallback if bucket doesn't exist or permission denied
                    selfieUrl = `https://placehold.co/640x480/png?text=Selfie+Error`;
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('attendance-selfies')
                        .getPublicUrl(filePath);
                    selfieUrl = publicUrl;
                }
            } catch (uploadErr) {
                console.error("Error uploading photo:", uploadErr);
                selfieUrl = `https://placehold.co/640x480/png?text=Upload+Failed`;
            }

            // 4. Insert Attendance
            const { error: insertError } = await supabase
                .from('attendance')
                .insert([{
                    user_id: profile.id,
                    clock_in: now.toISOString(),
                    location_lat: location.latitude,
                    location_long: location.longitude,
                    selfie_url: selfieUrl,
                    status: status,
                    penalty_amount: penalty
                }]);

            if (insertError) throw insertError;

            // 5. Notify Manager if Late
            // 5. Notify Manager if Late
            if (status === 'late') {
                console.log("DEBUG: Status is late. Fetching managers...");
                const managersResult = await getManagersAction();
                console.log("DEBUG: Managers result:", managersResult);

                if (managersResult.success && managersResult.managers) {
                    for (const manager of managersResult.managers) {
                        console.log("DEBUG: Notifying manager:", manager.id);
                        const notifResult = await createNotificationAction({
                            userId: manager.id,
                            title: "Staff Lewat",
                            message: `${userName} telah clock-in lewat hari ini (Penalti: RM${penalty.toFixed(2)})`,
                            type: "warning",
                            category: "attendance",
                            link: "/manager/attendance"
                        });
                        console.log("DEBUG: Notification result:", notifResult);
                    }
                } else {
                    console.error("DEBUG: Failed to fetch managers or no managers found.");
                }
            } else {
                console.log("DEBUG: Status is not late:", status);
            }

            alert(`Clock-in Berjaya! \nStatus: ${status === 'late' ? 'LEWAT' : 'HADIR'}${penalty > 0 ? `\nPenalti: RM${penalty.toFixed(2)}` : ''}`);
            window.location.reload();

        } catch (err: any) {
            console.error("Error clocking in:", err);
            setError(err.message || "Gagal clock-in. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const isWithinRange = distance !== null && distance <= maxDistance;

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-white">Clock-In Staff</h1>
                <p className="text-gray-400 text-sm">Sila pastikan anda berada di kedai.</p>
            </div>

            {/* Location Status */}
            <div className={`p-4 rounded-xl border ${isWithinRange ? 'bg-green-400/10 border-green-400/30' : 'bg-red-400/10 border-red-400/30'}`}>
                <div className="flex items-center gap-3 mb-2">
                    <MapPin className={`w-5 h-5 ${isWithinRange ? 'text-green-400' : 'text-red-400'}`} />
                    <h3 className={`font-bold ${isWithinRange ? 'text-green-400' : 'text-red-400'}`}>
                        {loading ? "Mencari Lokasi..." : isWithinRange ? "Lokasi Sah" : "Luari Kawasan"}
                    </h3>
                </div>
                <p className="text-xs text-gray-400">
                    Jarak dari kedai: <span className="text-white font-mono">{distance ? distance.toFixed(0) : '---'} meter</span>
                    <br />
                    (Max: {maxDistance}m)
                </p>

                {/* Debug Info (Toggleable) */}
                <div className="mt-4 border-t border-white/5 pt-3">
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="text-[10px] sm:text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1 font-bold uppercase tracking-widest"
                    >
                        {showDebug ? "Sorok Debug Info" : "Lihat Debug Info"}
                    </button>

                    {showDebug && (
                        <div className="mt-2 text-[10px] text-gray-400 font-mono bg-black/20 p-2 rounded-lg border border-white/5 animate-fade-in">
                            <p className="font-bold text-gray-500 mb-1">DEBUG DETAILS:</p>
                            <div className="space-y-1">
                                <p><span className="text-gray-600">Target (Shop):</span> {
                                    typeof window !== 'undefined' && localStorage.getItem("shopSettings")
                                        ? `${JSON.parse(localStorage.getItem("shopSettings")!).latitude.toFixed(4)}, ${JSON.parse(localStorage.getItem("shopSettings")!).longitude.toFixed(4)}`
                                        : `Default (${SHOP_LAT}, ${SHOP_LNG})`
                                }</p>
                                <p><span className="text-gray-600">Source:</span> {typeof window !== 'undefined' && localStorage.getItem("shopSettings") ? "Database/Cache" : "Hardcoded Default"}</p>
                                <p><span className="text-gray-600">Current (You):</span> {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "Locating..."}</p>
                                <p><span className="text-gray-600">Distance:</span> {distance ? distance.toFixed(1) : "---"}m</p>
                                <p><span className="text-gray-600">Max Radius:</span> {maxDistance}m</p>
                            </div>
                        </div>
                    )}
                </div>

                {!isWithinRange && !loading && (
                    <div className="flex flex-col gap-2 mt-3">
                        <div className="flex gap-2">
                            <button onClick={getLocation} className="text-xs flex items-center gap-1 text-primary hover:underline">
                                <RefreshCw className="w-3 h-3" /> Refresh GPS
                            </button>
                            <button onClick={() => { localStorage.removeItem("shopSettings"); getLocation(); }} className="text-xs flex items-center gap-1 text-red-400 hover:underline">
                                <RefreshCw className="w-3 h-3" /> Reset Settings
                            </button>
                        </div>
                        <button
                            onClick={async () => {
                                const managersResult = await getManagersAction();
                                if (managersResult.success && managersResult.managers) {
                                    for (const manager of managersResult.managers) {
                                        await createNotificationAction({
                                            userId: manager.id,
                                            title: "Masalah Lokasi Staff",
                                            message: `${userName} cuba clock-in tetapi berada di luar radius (${distance?.toFixed(0)}m).`,
                                            type: "error",
                                            category: "attendance",
                                            link: "/manager/attendance"
                                        });
                                    }
                                    alert("Masalah lokasi telah dilaporkan kepada Manager.");
                                }
                            }}
                            className="text-xs bg-red-500/20 text-red-400 py-2 rounded-lg hover:bg-red-500/30 transition-all font-bold"
                        >
                            Laporkan Masalah Lokasi ke Manager
                        </button>
                    </div>
                )}
            </div>

            {/* Camera Section */}
            {hasClockedIn ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Anda Telah Clock-In</h2>
                    <p className="text-gray-400">Terima kasih! Rekod kehadiran anda untuk hari ini telah disimpan.</p>
                </div>
            ) : isWithinRange ? (
                <div className="bg-surface border border-white/5 rounded-xl p-4 overflow-hidden">
                    {!capturedImage ? (
                        !isCameraOpen ? (
                            <button
                                onClick={startCamera}
                                className="w-full py-12 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-white hover:border-primary/50 transition-all"
                            >
                                <Camera className="w-12 h-12 mb-2" />
                                <span className="text-sm">Buka Kamera untuk Selfie</span>
                            </button>
                        ) : (
                            <div className="relative">
                                <video ref={videoRef} autoPlay className="w-full rounded-lg" />
                                <button
                                    onClick={capturePhoto}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full p-4 shadow-lg hover:scale-110 transition-transform"
                                >
                                    <div className="w-4 h-4 bg-red-500 rounded-full" />
                                </button>
                            </div>
                        )
                    ) : (
                        <div className="relative">
                            <img src={capturedImage} alt="Selfie" className="w-full rounded-lg" />
                            <button
                                onClick={() => setCapturedImage(null)}
                                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <div className="mt-4">
                                <button
                                    onClick={handleClockIn}
                                    className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    SAHKAN CLOCK-IN
                                </button>
                            </div>
                        </div>
                    )}
                    <canvas ref={canvasRef} width="640" height="480" className="hidden" />
                </div>
            ) : null}

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Attendance History Section */}
            <AttendanceHistory />
        </div>
    );
}


