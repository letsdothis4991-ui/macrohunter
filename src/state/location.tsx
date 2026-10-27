import * as Location from "expo-location";
import { createContext, type ReactNode, use, useState } from "react";

import { distanceKm, type LatLng, SAMPLE_AREA_CENTRE } from "@/lib/geo";

/** How far from the sample area a real location can be before we fall back to it. */
const SAMPLE_AREA_RADIUS_KM = 5;

type LocationState = {
  position: LatLng;
  source: "sample" | "device";
  /** Set when the device location was found but is outside the sample area. */
  outsideArea: boolean;
  busy: boolean;
  error: string | null;
  locateMe: () => Promise<void>;
};

const LocationContext = createContext<LocationState | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<LatLng>(SAMPLE_AREA_CENTRE);
  const [source, setSource] = useState<"sample" | "device">("sample");
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
      if (distanceKm(here, SAMPLE_AREA_CENTRE) > SAMPLE_AREA_RADIUS_KM) {
        setOutsideArea(true);
        setPosition(SAMPLE_AREA_CENTRE);
        setSource("sample");
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
