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

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    await apiFetch("/api/user/push-token", {
      method: "POST",
      body: JSON.stringify({ pushToken }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#C8102E",
      });
    }
  } catch (err) {
    console.log("[push] registerPushToken error:", err);
  }
}
