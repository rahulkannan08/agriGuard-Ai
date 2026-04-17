import React from "react";

const Sidebar = ({ user, navigate, active }) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard", path: "/" },
    { id: "heatmap", label: "Disease Map", icon: "map", path: "/heatmap" },
    {
      id: "diagnosis",
      label: "Leaf Scan",
      icon: "photo_camera",
      path: "/diagnosis",
    },
    { id: "chat", label: "AI Advisor", icon: "chat", path: "/chat" },
    { id: "voice", label: "Voice Chat", icon: "mic", path: "/voice" },
    {
      id: "catalog",
      label: "Crop Catalog",
      icon: "potted_plant",
      path: "/catalog",
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 backdrop-blur-xl border-t border-outline-variant/10 z-40 rounded-t-3xl">
        {menuItems.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            className={`flex flex-col items-center justify-center text-[10px] font-medium gap-1 ${
              active === item.id
                ? "bg-primary text-white rounded-2xl px-4 py-1 scale-90"
                : "text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col h-screen fixed left-0 top-0 pt-20 pb-8 bg-surface-container-low border-r border-outline-variant/10 w-64 z-40">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-secondary-container overflow-hidden">
              <img
                className="w-full h-full object-cover"
                alt="User Profile"
                src={
                  user?.avatar ||
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuCWm4K_kYrAcEr0Ue5FGJBZERXJxfdwwJaqLVOO3BKbciz9f0683bs6M0onrCJXC5Aa9-lkeryyiALoLpOFRNeNB076z0NnTKxfXVGFoW6VDvkXWIFkHPAvrjjbpBQ1jZph77wjdUiYDWYw2qqsgXQDmWTQ78vCIqoHtu9gnzrzK40A0Sdjm-Jxoqbr8WWvODQzOfgIibkhz551XNGkoSTGRbb1f-jzdGPBCz_RQtPqH0ZTaNCMiInYxaDNOqvnKBdcX1oiTzmL9A"
                }
                loading="lazy"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">
                {user?.role === "official"
                  ? "Officer Portal"
                  : "Farmer Dashboard"}
              </p>
              <p className="text-xs text-on-surface-variant">
                {user?.area || "Region"}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNavigation("/diagnosis")}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">add_a_photo</span>
            <span>New Leaf Scan</span>
          </button>
        </div>

        <nav className="flex-grow space-y-1 px-0">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 py-3 px-6 font-semibold transition-all ${
                active === item.id
                  ? "bg-primary text-white rounded-r-full"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-6 space-y-1 border-t border-outline-variant/10 pt-6">
          <button
            onClick={() => handleNavigation("/support")}
            className="flex items-center gap-3 py-2 text-on-surface-variant hover:text-primary font-semibold text-sm w-full rounded-lg hover:bg-surface-container-high transition-colors px-3"
          >
            <span className="material-symbols-outlined">help</span>
            <span>Support</span>
          </button>
          <button
            onClick={() => handleNavigation("/settings")}
            className="flex items-center gap-3 py-2 text-on-surface-variant hover:text-primary font-semibold text-sm w-full rounded-lg hover:bg-surface-container-high transition-colors px-3"
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default React.memo(Sidebar);
