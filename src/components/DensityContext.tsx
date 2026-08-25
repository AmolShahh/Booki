import React, { createContext, useContext, useEffect, useState } from "react";

export type Density = "compact" | "cozy";

interface DensityContextValue {
  density: Density;
  toggleDensity: () => void;
  setDensity: (d: Density) => void;
}

const DensityContext = createContext<DensityContextValue | null>(null);
const STORAGE_KEY = "booki-density";

const readInitialDensity = (): Density => {
  if (typeof window === "undefined") return "compact";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "cozy" ? "cozy" : "compact";
};

export const DensityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [density, setDensityState] = useState<Density>(readInitialDensity);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, density);
    } catch {
      /* ignore */
    }
  }, [density]);

  const value: DensityContextValue = {
    density,
    toggleDensity: () => setDensityState((d) => (d === "compact" ? "cozy" : "compact")),
    setDensity: setDensityState,
  };

  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
};

export const useDensity = (): DensityContextValue => {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error("useDensity must be used within DensityProvider");
  return ctx;
};
