import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue in Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DiseaseMap = ({ zones = [], onZoneSelect }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map centered on India
    map.current = L.map(mapContainer.current).setView([20.5937, 78.9629], 5);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Add zone markers with heat circles
    zones.forEach((zone, idx) => {
      if (zone.latitude && zone.longitude) {
        const color =
          zone.risk === 'High' ? '#d32f2f' : zone.risk === 'Moderate' ? '#f57c00' : '#388e3c';

        // Add circle marker for heat visualization
        L.circleMarker([zone.latitude, zone.longitude], {
          radius: zone.affected || 15,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4,
        })
          .bindPopup(
            `<div style="font-size: 12px; font-weight: bold;">
              <p>${zone.name}</p>
              <p>Risk: ${zone.risk}</p>
              <p>Affected: ${zone.affected}%</p>
            </div>`
          )
          .addTo(map.current)
          .on('click', () => onZoneSelect?.(zone.id));

        // Add marker
        L.marker([zone.latitude, zone.longitude], {
          title: zone.name,
        })
          .bindPopup(zone.name)
          .addTo(map.current);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [zones, onZoneSelect]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full rounded-2xl overflow-hidden shadow-lg border border-outline-variant/20"
      style={{ minHeight: '500px' }}
    />
  );
};

export default DiseaseMap;
