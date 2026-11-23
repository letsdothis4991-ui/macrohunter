"use client";
import { useEffect, useState } from "react";

import { api } from "./api";
import type { Status } from "./types";

let cached: Status | null = null;

export function useStatus(): Status | null {
  const [status, setStatus] = useState<Status | null>(cached);
  useEffect(() => {
    if (cached) return;
    api<Status>("/api/status")
      .then((s) => {
        cached = s;
        setStatus(s);
      })
      .catch(() => {});
  }, []);
  return status;
}
