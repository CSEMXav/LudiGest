import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { getToken } from "@/lib/auth";
import { registerPushToken } from "@/lib/push";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    getToken().then((token) => {
      if (token) {
        router.replace("/(tabs)");
        registerPushToken(); // re-register on every app start to keep DB token fresh
      } else {
        router.replace("/(auth)/login");
      }
    });
  }, []);

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#C8102E" }, headerTintColor: "#fff", headerTitleStyle: { fontWeight: "bold" } }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="game/[id]" options={{ title: "Détail du jeu" }} />
      <Stack.Screen name="account" options={{ title: "Mon compte" }} />
      <Stack.Screen name="admin/add-game" options={{ title: "Ajouter un jeu" }} />
    </Stack>
  );
}
