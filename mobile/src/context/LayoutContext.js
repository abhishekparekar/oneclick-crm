import React, { createContext, useContext, useState, useCallback } from "react";

const LayoutContext = createContext(null);

export const LayoutProvider = ({ children }) => {
  const [config, setConfig] = useState({
    activeTab: "Dashboard",
    showSearch: false,
    searchPlaceholder: "Search...",
    searchValue: "",
    onSearchChange: null,
    unreadNotifications: 0,
  });

  const updateConfig = useCallback((newConfig) => {
    setConfig((prev) => {
      let hasChanges = false;
      const merged = { ...prev };

      for (const key in newConfig) {
        if (prev[key] !== newConfig[key]) {
          merged[key] = newConfig[key];
          hasChanges = true;
        }
      }

      return hasChanges ? merged : prev;
    });
  }, []);

  const value = {
    ...config,
    updateConfig,
    isParentLayoutMounted: true,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  return useContext(LayoutContext);
};

export default LayoutContext;
