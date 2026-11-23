"use client";
import type { ApiError } from "./types";

export class ApiFailure extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...(init.headers ?? {}) } : init?.headers,
    });
  } catch {
    throw new ApiFailure("Couldn't reach MacroHunter. Check your connection and try again.", 0);
  }
  const body = (await res.json().catch(() => null)) as (T & ApiError) | null;
  if (!res.ok) {
    if (res.status === 401 && body?.code === "auth") {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    throw new ApiFailure(body?.error ?? `Something went wrong (${res.status}).`, res.status, body?.code);
  }
  return body as T;
}
