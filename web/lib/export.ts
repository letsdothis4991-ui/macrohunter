/**
 * Getting meals into other trackers. No tracker (MacroFactor, MyFitnessPal, Cronometer)
 * accepts food from websites, so we offer text to paste into a quick add and a CSV.
 */
import type { Macros } from "@/lib/nutrition";

import type { LogEntry } from "./daily";

export function trackerText(name: string, m: Macros, venueName?: string): string {
  const where = venueName ? ` (${venueName})` : "";
  return `${name}${where}: ${Math.round(m.calories)} kcal, ${Math.round(m.protein)}g protein, ${Math.round(m.carbs)}g carbs, ${Math.round(m.fat)}g fat`;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function logToCsv(entries: LogEntry[]): string {
  const header = ["Date", "Time", "Meal", "Place", "Calories (kcal)", "Protein (g)", "Carbs (g)", "Fat (g)", "Source"];
  const rows = [...entries]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((e) => {
      const t = new Date(e.at);
      const time = Number.isNaN(t.getTime()) ? "" : `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
      return [e.day, time, e.name, e.venueName ?? "", e.macros.calories, e.macros.protein, e.macros.carbs, e.macros.fat, e.source];
    });
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function downloadText(filename: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
