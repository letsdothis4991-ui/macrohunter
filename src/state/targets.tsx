import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, use, useEffect, useState } from "react";

import { DEFAULT_TARGETS, type Targets } from "@/lib/matching";

const STORAGE_KEY = "macrohunter.targets.v1";

type TargetsState = { targets: Targets; setTargets: (t: Targets) => void };

const TargetsContext = createContext<TargetsState | null>(null);

export function TargetsProvider({ children }: { children: ReactNode }) {
  const [targets, setTargetsState] = useState<Targets>(DEFAULT_TARGETS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(
        (raw) =>
          raw && setTargetsState({ ...DEFAULT_TARGETS, ...JSON.parse(raw) }),
      )
      .catch(() => {});
  }, []);

  const setTargets = (t: Targets) => {
    setTargetsState(t);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(t)).catch(() => {});
  };

  return (
    <TargetsContext value={{ targets, setTargets }}>{children}</TargetsContext>
  );
}

export function useTargets(): TargetsState {
  const ctx = use(TargetsContext);
  if (!ctx) throw new Error("useTargets must be used inside TargetsProvider");
  return ctx;
}
