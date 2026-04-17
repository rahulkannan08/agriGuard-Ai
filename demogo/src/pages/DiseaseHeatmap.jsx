import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Sidebar from "../components/Sidebar";
import DiseaseMap from "../components/DiseaseMap";
import { getDiseaseStats } from "../services/api";

const DiseaseHeatmap = ({ user, language, updateUserProfile }) => {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState(null);
  const [zoneData, setZoneData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real zone data from backend
  useEffect(() => {
    const fetchZones = async () => {
      try {
        setLoading(true);
        const stats = await getDiseaseStats(
          user?.latitude,
          user?.longitude
        );
        
        // Transform backend data or use mock structure
        const zones = stats.zones || [
          {
            id: "zone1",
            name: "Northern Region",
            risk: "High",
            latitude: 28.7041,
            longitude: 77.1025,
            affected: 35,
            diseases: "Downy Mildew, Blight",
          },
          {
            id: "zone2",
            name: "Central Area",
            risk: "Moderate",
            latitude: 23.1815,
            longitude: 79.9864,
            affected: 18,
            diseases: "Rust, Leaf Spot",
          },
          {
            id: "zone3",
            name: "Southern Zone",
            risk: "Low",
            latitude: 12.9716,
            longitude: 77.5946,
            affected: 5,
            diseases: "Minor Damage",
          },
        ];
        
        setZoneData(zones);
        if (zones.length > 0) {
          setSelectedZone(zones[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch zone data:", err);
        setError("Unable to load disease data. Please try again.");
        // Set default zones on error
        setZoneData([
          {
            id: "zone1",
            name: "Northern Region",
            risk: "High",
            latitude: 28.7041,
            longitude: 77.1025,
            affected: 35,
            diseases: "Downy Mildew, Blight",
          },
          {
            id: "zone2",
            name: "Central Area",
            risk: "Moderate",
            latitude: 23.1815,
            longitude: 79.9864,
            affected: 18,
            diseases: "Rust, Leaf Spot",
          },
          {
            id: "zone3",
            name: "Southern Zone",
            risk: "Low",
            latitude: 12.9716,
            longitude: 77.5946,
            affected: 5,
            diseases: "Minor Damage",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchZones();
  }, [user]);

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} navigate={navigate} active="heatmap" />
      <div className="flex-grow md:ml-64">
        <Navigation user={user} updateUserProfile={updateUserProfile} />
        <main className="p-4 md:p-8 bg-surface min-h-screen">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-headline font-bold text-primary mb-2">
                Disease Spread Heatmap
              </h1>
              <p className="text-on-surface-variant">
                Real-time disease monitoring across surrounding regions
              </p>
            </div>

            {/* Main Map */}
            {loading ? (
              <div className="bg-surface-container-low rounded-2xl overflow-hidden shadow-lg h-96 md:h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-primary-fixed border-t-primary animate-spin mx-auto mb-4"></div>
                  <p className="text-on-surface-variant">Loading disease map...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-surface-container-low rounded-2xl overflow-hidden shadow-lg h-96 md:h-[500px] flex items-center justify-center">
                <p className="text-error">{error}</p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <DiseaseMap zones={zoneData} onZoneSelect={setSelectedZone} />
              </div>
            )}

            {/* Zone Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {zoneData.map((zone) => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(zone.id)}
                  className={`p-6 rounded-xl cursor-pointer transition-all border-2 ${
                    selectedZone === zone.id
                      ? "border-primary bg-primary-fixed/10 shadow-lg"
                      : "border-outline-variant/20 bg-surface-container-lowest hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-on-surface text-lg">
                        {zone.name}
                      </h3>
                      <p className="text-sm text-on-surface-variant mt-1">
                        {zone.diseases}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        zone.risk === "High"
                          ? "bg-error-container text-error"
                          : zone.risk === "Moderate"
                            ? "bg-tertiary-fixed text-on-tertiary-fixed"
                            : "bg-primary-fixed text-on-primary-fixed-variant"
                      }`}
                    >
                      {zone.risk} Risk
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">
                        Affected Area
                      </span>
                      <span className="text-sm font-bold text-on-surface">
                        {zone.affected}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-high rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          zone.risk === "High"
                            ? "bg-error"
                            : zone.risk === "Moderate"
                              ? "bg-tertiary-fixed-dim"
                              : "bg-primary-fixed"
                        }`}
                        style={{
                          width: `${zone.affected}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2 px-3 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-container transition-all">
                      View Details
                    </button>
                    <button
                      onClick={() => navigate("/chat")}
                      className="py-2 px-3 bg-surface-container-high text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container transition-all"
                    >
                      Ask Advisor
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Area Affected",
                  value: `${Math.round(zoneData.reduce((sum, z) => sum + (z.affected || 0), 0) / zoneData.length)}%`,
                  icon: "area_chart",
                },
                { label: "Zones Monitored", value: zoneData.length, icon: "category" },
                {
                  label: "Disease Types",
                  value: new Set(
                    zoneData.flatMap(z => z.diseases.split(", "))
                  ).size,
                  icon: "agriculture",
                },
                {
                  label: "Alert Status",
                  value: "Active",
                  icon: "notifications_active",
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20"
                >
                  <span className="material-symbols-outlined text-3xl text-primary mb-2">
                    {stat.icon}
                  </span>
                  <p className="text-xs text-on-surface-variant uppercase mb-1 font-semibold">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-on-surface">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DiseaseHeatmap;
