'use client';

import { Fragment, useEffect, useMemo } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';

export type DiseaseHeatPoint = {
  lat: number;
  lng: number;
  intensity: number;
  disease?: string;
  count?: number;
};

export type DiseaseMapPin = {
  id: string;
  lat: number;
  lng: number;
  disease: string;
  severity?: string | null;
  confidence?: number | null;
  isDangerous?: boolean;
  safetyStatus?: 'unsafe' | 'caution' | 'watch' | 'safe';
  nearestDangerKm?: number | null;
  detectedAt?: string | null;
  imageMetadata?: Record<string, unknown> | null;
};

export type DangerRingSource = {
  id: string;
  lat: number;
  lng: number;
  disease: string;
  severity?: string | null;
};

type DiseaseHeatmapProps = {
  center: [number, number];
  points: DiseaseHeatPoint[];
  pins: DiseaseMapPin[];
  dangerRings: DangerRingSource[];
  selectedPinId?: string | null;
  onSelectPin?: (pinId: string) => void;
};

const FALLBACK_POINTS: DiseaseHeatPoint[] = [
  { lat: 12.9716, lng: 77.5946, intensity: 0.8, disease: 'Late Blight', count: 5 },
  { lat: 12.972, lng: 77.595, intensity: 0.5, disease: 'Apple Scab', count: 3 },
  { lat: 12.969, lng: 77.59, intensity: 1.0, disease: 'Bacterial Spot', count: 7 },
];

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
}

function HeatmapLayer({ points }: { points: DiseaseHeatPoint[] }) {
  const map = useMap();

  useEffect(() => {
    const source = points.length > 0 ? points : FALLBACK_POINTS;
    const heatData = source.map((point) => [point.lat, point.lng, point.intensity] as [number, number, number]);
    let layer: any = null;
    let cancelled = false;

    const setupHeatLayer = async () => {
      const leafletModule = await import('leaflet');
      const leaflet = (leafletModule as any).default || leafletModule;

      // leaflet.heat expects L on the global window scope.
      if (typeof window !== 'undefined') {
        (window as any).L = leaflet;
      }

      await import('leaflet.heat');

      if (cancelled) {
        return;
      }

      layer = (leaflet as any).heatLayer(heatData, {
        radius: 28,
        blur: 22,
        maxZoom: 14,
        minOpacity: 0.35,
        gradient: {
          0.2: '#4ade80',
          0.45: '#facc15',
          0.7: '#fb923c',
          1.0: '#ef4444',
        },
      });

      layer.addTo(map);
    };

    void setupHeatLayer();

    return () => {
      cancelled = true;
      if (layer) {
        map.removeLayer(layer);
      }
    };
  }, [map, points]);

  return null;
}

function DangerZoneRings({ dangerRings }: { dangerRings: DangerRingSource[] }) {
  if (dangerRings.length === 0) {
    return null;
  }

  return (
    <>
      {dangerRings.map((ring) => {
        const ringCenter: [number, number] = [ring.lat, ring.lng];

        return (
          <Fragment key={ring.id}>
            <Circle
              center={ringCenter}
              radius={6000}
              pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.04, weight: 1.5 }}
            />
            <Circle
              center={ringCenter}
              radius={4000}
              pathOptions={{ color: '#facc15', fillColor: '#facc15', fillOpacity: 0.06, weight: 1.5 }}
            />
            <Circle
              center={ringCenter}
              radius={2000}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.12, weight: 2 }}
            />
          </Fragment>
        );
      })}
    </>
  );
}

function PinLayer({
  pins,
  selectedPinId,
  onSelectPin,
}: {
  pins: DiseaseMapPin[];
  selectedPinId?: string | null;
  onSelectPin?: (pinId: string) => void;
}) {
  return (
    <>
      {pins.map((pin) => {
        const isSelected = pin.id === selectedPinId;
        const metadata = pin.imageMetadata || null;
        const cameraMake = typeof metadata?.cameraMake === 'string' ? metadata.cameraMake : '';
        const cameraModel = typeof metadata?.cameraModel === 'string' ? metadata.cameraModel : '';
        const capturedAt = typeof metadata?.capturedAt === 'string' ? metadata.capturedAt : null;
        const cameraText = `${cameraMake} ${cameraModel}`.trim();

        const safetyStatus = pin.safetyStatus || 'safe';
        let markerColor = '#2563eb';
        let markerFill = '#3b82f6';
        if (pin.isDangerous || safetyStatus === 'unsafe') {
          markerColor = '#b91c1c';
          markerFill = '#ef4444';
        } else if (safetyStatus === 'caution') {
          markerColor = '#b45309';
          markerFill = '#f59e0b';
        } else if (safetyStatus === 'watch') {
          markerColor = '#166534';
          markerFill = '#22c55e';
        }

        return (
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lng]}
            radius={isSelected ? 10 : 7}
            pathOptions={{
              color: isSelected ? '#111827' : markerColor,
              fillColor: markerFill,
              fillOpacity: 0.92,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onSelectPin?.(pin.id),
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p><strong>Disease:</strong> {pin.disease || 'Unknown'}</p>
                <p><strong>Coordinates:</strong> {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</p>
                <p><strong>Safety Status:</strong> {safetyStatus.toUpperCase()}</p>
                {typeof pin.nearestDangerKm === 'number' && (
                  <p><strong>Nearest Dangerous Case:</strong> {pin.nearestDangerKm.toFixed(2)} km</p>
                )}
                {pin.detectedAt && <p><strong>Detected:</strong> {new Date(pin.detectedAt).toLocaleString()}</p>}
                {capturedAt && <p><strong>Captured:</strong> {new Date(capturedAt).toLocaleString()}</p>}
                {cameraText && <p><strong>Camera:</strong> {cameraText}</p>}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function DiseaseHeatmap({
  center,
  points,
  pins,
  dangerRings,
  selectedPinId,
  onSelectPin,
}: DiseaseHeatmapProps) {
  const activePin = useMemo(() => {
    if (pins.length === 0) {
      return null;
    }

    const selected = pins.find((pin) => pin.id === selectedPinId);
    return selected || pins[0];
  }, [pins, selectedPinId]);

  return (
    <MapContainer
      center={center}
      zoom={8}
      scrollWheelZoom={true}
      className="h-[460px] w-full rounded-2xl"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} />
      <HeatmapLayer points={points} />
      <PinLayer pins={pins} selectedPinId={activePin?.id || null} onSelectPin={onSelectPin} />
      <DangerZoneRings dangerRings={dangerRings} />
    </MapContainer>
  );
}
