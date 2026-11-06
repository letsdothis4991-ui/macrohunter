import * as Location from "expo-location";
import { createContext, type ReactNode, use, useState } from "react";

import { AREA } from "@/data";
import { distanceKm, type LatLng } from "@/lib/geo";

type LocationState = {
  position: LatLng;
  source: "area" | "device";
  /** Set when the device location was found but is outside the covered area. */
  outsideArea: boolean;
  busy: boolean;
  error: string | null;
  locateMe: () => Promise<void>;
};

const LocationContext = createContext<LocationState | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<LatLng>(AREA);
  const [source, setSource] = useState<"area" | "device">("area");
  const [outsideArea, setOutsideArea] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locateMe = async () => {
    setBusy(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission was not granted.");
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const here = { lat: coords.latitude, lng: coords.longitude };
      if (distanceKm(here, AREA) > AREA.radiusKm) {
        setOutsideArea(true);
        setPosition(AREA);
        setSource("area");
      } else {
        setOutsideArea(false);
        setPosition(here);
        setSource("device");
      }
    } catch {
      setError("Couldn't get your location.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <LocationContext
      value={{ position, source, outsideArea, busy, error, locateMe }}
    >
      {children}
    </LocationContext>
  );
}

export function useLocation(): LocationState {
  const ctx = use(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}
