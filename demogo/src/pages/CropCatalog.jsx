import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Sidebar from "../components/Sidebar";

const CropCatalog = ({ user, language, setLanguage }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const crops = [
    {
      id: 1,
      name: "Rice",
      category: "staple",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDjLqDpEtWa8P6kZmXub4OsGXcWplPT7c8-d1y71IgXvx0FhQ1F5dvJVIPYMaR7EDJb8B_lawEXWxYOCfVqzhop-4LKkML0Lwsdx_J-oCm-lnX4O0XYpLgXjqnD1PJpKAgfWqF7rE1TKUU1IG9CqiKWbWU4rCL3xPZVDhLk68FpbTcG9Ef4dV4eFp-JQQNFLMYct-ACLwIwmOBo_3AOzebQtbIvUHE7TC5yN2khNjWa9Qkv7Vs6OzE8aWesEQqGYbY9mj2lrDKKTQ",
      description: "Paddy rice - staple grain crop",
      diseases: ["Brown Spot", "Blast", "Leaf Scald"],
      growthPeriod: "120-150 days",
      season: "Monsoon & Winter",
    },
    {
      id: 2,
      name: "Maize",
      category: "staple",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBzDRoOA--K1PCmrnMcLOmWVpSRcEiLOpTuMmG8Lu1E48uMKnfoWRoqzA1v9wk49YuCa-6_YPtGnGzW2Rq4JOpWgJCusA7j4PifSBG6ZjGeKTyve3zhPdb7_mYQFi702ZGy8-MrmArtnueaTzF7w2pbjEVHbmy4zaX-HfspmWbYbfGUNEn5Y8t2Ll9pEgS9YxDs96aWExNVopKoE86GTx2atxmD5OPQdhYMobmdL6NWU9eDQyMHDeKelz3_tqhAek_xR1g9lMdqeA",
      description: "Sweet corn - high yield crop",
      diseases: ["Northern Leaf Blight", "Rust", "Anthracnose"],
      growthPeriod: "80-120 days",
      season: "Summer & Winter",
    },
    {
      id: 3,
      name: "Tomato",
      category: "vegetables",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCvC81cG5dHogeyA2gb7wyxqbnOhDz2WObZbcjbPfhn-LaA5rkqYIrUJB4I9BiVz4Fw3jx-q9irMa7GcEdEutRJreLy-RbvCRdaI9JNUB5m1_6bMQs6cNhpbJnbJVMija9WpzQ_LZTnZ0lh5vouY_SyMtpJt6D2bMV3hGEhYlHapzLN2JDlMmixIs9xBbibAPFAOGatcASqym6Jen0wf1A0FJxPpojT6W0xRtN7JKs22iMVjL19B7ciMH_uOiZwpoexEkm3HL3hVA",
      description: "Heirloom tomato variety",
      diseases: ["Early Blight", "Late Blight", "Septoria Leaf Spot"],
      growthPeriod: "60-85 days",
      season: "Year-round",
    },
    {
      id: 4,
      name: "Coffee",
      category: "beverages",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBih0TU794NE2Q7fwD2uXgoiwa6iPN20bAmWfapGRpAnkGbTyG3pZha7r_V98FqAiKfG0BwHbpk1sU56f4jlJJyL2PGRHCDcSbS2EoI7lzv2fVlzp4XkPSQXTfT0mD6TGjK1PS-TwbeHps6xJDgBu6SD0C7mo0KnubF9zEu5SoemuUc60GpQ5-7GtqF3VeepkOzJkYXWu_etY_1QoII1CaQsWj-GpPiJQSLOWcVpTchOwVVGVHMBZRs5CH65Eh3hB6vFmilck-1Fg",
      description: "Arabica coffee beans",
      diseases: ["Coffee Rust", "Leaf Spot", "Anthracnose"],
      growthPeriod: "3-4 years to mature",
      season: "Monsoon",
    },
    {
      id: 5,
      name: "Wheat",
      category: "staple",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDjLqDpEtWa8P6kZmXub4OsGXcWplPT7c8-d1y71IgXvx0FhQ1F5dvJVIPYMaR7EDJb8B_lawEXWxYOCfVqzhop-4LKkML0Lwsdx_J-oCm-lnX4O0XYpLgXjqnD1PJpKAgfWqF7rE1TKUU1IG9CqiKWbWU4rCL3xPZVDhLk68FpbTcG9Ef4dV4eFp-JQQNFLMYct-ACLwIwmOBo_3AOzebQtbIvUHE7TC5yN2khNjWa9Qkv7Vs6OzE8aWesEQqGYbY9mj2lrDKKTQ",
      description: "Winter wheat variety",
      diseases: ["Powdery Mildew", "Septoria", "Rust"],
      growthPeriod: "150-180 days",
      season: "Winter",
    },
    {
      id: 6,
      name: "Sugarcane",
      category: "cash-crops",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDjLqDpEtWa8P6kZmXub4OsGXcWplPT7c8-d1y71IgXvx0FhQ1F5dvJVIPYMaR7EDJb8B_lawEXWxYOCfVqzhop-4LKkML0Lwsdx_J-oCm-lnX4O0XYpLgXjqnD1PJpKAgfWqF7rE1TKUU1IG9CqiKWbWU4rCL3xPZVDhLk68FpbTcG9Ef4dV4eFp-JQQNFLMYct-ACLwIwmOBo_3AOzebQtbIvUHE7TC5yN2khNjWa9Qkv7Vs6OzE8aWesEQqGYbY9mj2lrDKKTQ",
      description: "Cash crop sugarcane",
      diseases: ["Red Rot", "Smut", "Leaf Scald"],
      growthPeriod: "12-14 months",
      season: "Year-round",
    },
  ];

  const categories = [
    { id: "all", label: "All Crops" },
    { id: "staple", label: "Staple Crops" },
    { id: "vegetables", label: "Vegetables" },
    { id: "cash-crops", label: "Cash Crops" },
    { id: "beverages", label: "Beverages" },
  ];

  const filteredCrops = useMemo(() => {
    return crops.filter((crop) => {
      const matchesCategory =
        selectedCategory === "all" || crop.category === selectedCategory;
      const matchesSearch = crop.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} navigate={navigate} active="catalog" />
      <div className="flex-grow md:ml-64">
        <Navigation
          user={user}
          language={language}
          setLanguage={setLanguage}
          updateUserProfile={updateUserProfile}
        />
        <main className="p-4 md:p-8 pb-24 bg-surface">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold font-headline text-primary mb-2">
                Crop Catalog
              </h1>
              <p className="text-on-surface-variant">
                Browse and learn about supported crops and their disease
                profiles
              </p>
            </div>

            {/* Search Bar */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search crops..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-grow bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full font-semibold transition-all ${
                    selectedCategory === cat.id
                      ? "bg-primary text-white shadow-lg"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Crops Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCrops.map((crop) => (
                <div
                  key={crop.id}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Image */}
                  <div className="h-48 overflow-hidden bg-surface-container-high">
                    <img
                      src={crop.image}
                      alt={crop.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-primary mb-1">
                        {crop.name}
                      </h3>
                      <p className="text-sm text-on-surface-variant">
                        {crop.description}
                      </p>
                    </div>

                    {/* Info Badges */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-secondary">
                          calendar_month
                        </span>
                        <span className="text-on-surface-variant">
                          {crop.growthPeriod}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-tertiary">
                          cloud
                        </span>
                        <span className="text-on-surface-variant">
                          {crop.season}
                        </span>
                      </div>
                    </div>

                    {/* Common Diseases */}
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                        Common Diseases
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {crop.diseases.map((disease, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-error-container text-on-error-container text-[11px] font-bold rounded-full"
                          >
                            {disease}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => navigate("/diagnosis")}
                        className="flex-1 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-container transition-all active:scale-95"
                      >
                        <span className="flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-sm">
                            photo_camera
                          </span>{" "}
                          Scan
                        </span>
                      </button>
                      <button
                        onClick={() => navigate("/chat")}
                        className="flex-1 py-2 bg-surface-container-high text-on-surface rounded-lg font-bold text-sm hover:bg-surface-container-highest transition-all active:scale-95"
                      >
                        <span className="flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-sm">
                            chat
                          </span>{" "}
                          Ask AI
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* No Results */}
            {filteredCrops.length === 0 && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-6xl text-surface-container-high mb-4 block">
                  search_off
                </span>
                <p className="text-on-surface-variant text-lg">
                  No crops found matching your search
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CropCatalog;
