import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiFetch } from "./api";

export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    // Push notifications removed from Expo Go since SDK 53 — skip silently
    if (Constants.appOwnership === "expo") return;

    // Android : créer le canal EN PREMIER, avant toute demande de permission
    // ou récupération de token — sans canal, Android 8+ rejette silencieusement
    // toutes les notifications.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Notifications LudiGest",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#C8102E",
        sound: "default",
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[push] Permission refusée");
      return;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("[push] projectId EAS introuvable — push désactivé");
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;
    console.log("[push] Token obtenu :", pushToken);

    await apiFetch("/api/user/push-token", {
      method: "POST",
      body: JSON.stringify({ pushToken }),
    });

    console.log("[push] Token enregistré en base");
  } catch (err) {
    console.log("[push] registerPushToken error:", err);
  }
}
