import { useEffect, useRef } from "react";
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
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    getToken().then((token) => {
      if (token) {
        router.replace("/(tabs)");
        registerPushToken();
      } else {
        router.replace("/(auth)/login");
      }
    });
  }, []);

  useEffect(() => {
    // Notif reçue en foreground
    notifListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("[push] Notification reçue en foreground :", JSON.stringify(notification));
    });

    // Utilisateur a tapé sur la notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("[push] Tap sur notification :", JSON.stringify(response));
      const data = response.notification.request.content.data as { type?: string; loanId?: string; gameId?: string };
      if (data?.type === "loan_reminder") {
        router.push("/(tabs)/loans");
      } else if (data?.type === "game_available" && data.gameId) {
        router.push(`/game/${data.gameId}`);
      } else if (data?.type === "game_wanted" && data.gameId) {
        router.push(`/game/${data.gameId}`);
      } else if (data?.type === "session_reminder") {
        router.push("/(tabs)/sessions");
      }
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
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
