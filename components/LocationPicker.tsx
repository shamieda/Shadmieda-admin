"use client";

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Component to handle map clicks and updates
function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
    const map = useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    useEffect(() => {
        map.flyTo(position, map.getZoom());
    }, [position, map]);

    return position === null ? null : (
        <Marker
            position={position}
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    const marker = e.target;
                    const position = marker.getLatLng();
                    setPosition([position.lat, position.lng]);
                },
            }}
        />
    );
}

interface LocationPickerProps {
    latitude: number;
    longitude: number;
    onLocationChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ latitude, longitude, onLocationChange }: LocationPickerProps) {
    // Ensure valid coordinates
    const validLat = isNaN(latitude) || latitude === undefined ? 3.1412 : latitude;
    const validLng = isNaN(longitude) || longitude === undefined ? 101.6865 : longitude;

    const [position, setPosition] = useState<[number, number]>([validLat, validLng]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Fix Leaflet icon issue
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
    }, []);

    useEffect(() => {
        const newLat = isNaN(latitude) ? 3.1412 : latitude;
        const newLng = isNaN(longitude) ? 101.6865 : longitude;
        setPosition([newLat, newLng]);
    }, [latitude, longitude]);

    const handlePositionChange = (pos: [number, number]) => {
        setPosition(pos);
        onLocationChange(pos[0], pos[1]);
    };

    if (!mounted) return <div className="h-[300px] w-full bg-white/5 animate-pulse rounded-xl" />;

    return (
        <div className="h-[300px] w-full rounded-xl overflow-hidden border border-white/10 z-0 relative">
            <MapContainer
                center={position}
                zoom={15}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={position} setPosition={handlePositionChange} />
            </MapContainer>
        </div>
    );
}
