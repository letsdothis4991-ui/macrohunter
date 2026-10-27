import { useColorScheme } from "react-native";

const palette = {
  light: {
    text: "#11181C",
    textSecondary: "#5F6670",
    background: "#FFFFFF",
    card: "#F3F5F4",
    border: "#E1E5E3",
    accent: "#0E8A5F",
    accentSoft: "#DDF3EA",
    warning: "#B26B00",
    warningSoft: "#FCEFD8",
    danger: "#B42318",
    dangerSoft: "#FDE4E1",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#A3AAB2",
    background: "#0E1110",
    card: "#1A1E1C",
    border: "#2A302D",
    accent: "#3CCB91",
    accentSoft: "#173A2C",
    warning: "#F0B04C",
    warningSoft: "#3A2D14",
    danger: "#F97066",
    dangerSoft: "#3D1A17",
  },
} as const;

export type Palette = { [K in keyof typeof palette.light]: string };

export function usePalette(): Palette {
  return palette[useColorScheme() === "dark" ? "dark" : "light"];
}

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const Radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
