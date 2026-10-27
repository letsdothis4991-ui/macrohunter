import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";

import { LocationProvider } from "@/state/location";
import { TargetsProvider } from "@/state/targets";

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <TargetsProvider>
        <LocationProvider>
          <Stack>
            <Stack.Screen name="index" options={{ title: "MacroHunter" }} />
            <Stack.Screen
              name="targets"
              options={{ title: "Your targets", presentation: "modal" }}
            />
            <Stack.Screen name="dish/[id]" options={{ title: "" }} />
            <Stack.Screen name="venue/[id]" options={{ title: "" }} />
          </Stack>
          <StatusBar style="auto" />
        </LocationProvider>
      </TargetsProvider>
    </ThemeProvider>
  );
}
