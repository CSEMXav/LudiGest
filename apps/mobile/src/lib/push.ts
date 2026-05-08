import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiFetch } from "./api";

/** Retourne null si succès, sinon la raison d'échec (pour affichage). */
export async function registerPushToken(): Promise<string | null> {
  console.log("[push] start — isDevice:", Device.isDevice, "env:", Constants.executionEnvironment, "appOwnership:", Constants.appOwnership);

  if (!Device.isDevice) {
    console.log("[push] Not a real device — skip");
    return "Simulateur détecté (pas un vrai appareil).";
  }

  if (Constants.executionEnvironment === "storeClient" || Constants.appOwnership === "expo") {
    console.log("[push] Expo Go — skip");
    return "Expo Go ne supporte pas les notifications push.";
  }

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Notifications LudiGest",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#C8102E",
        sound: "default",
      });
      console.log("[push] Canal Android créé");
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("[push] Permission existante:", existingStatus);
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("[push] Permission demandée, résultat:", finalStatus);
    }

    if (finalStatus !== "granted") {
      console.log("[push] Permission refusée — finalStatus:", finalStatus);
      return `Permission refusée (statut: ${finalStatus}). Activez les notifications dans les réglages.`;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    console.log("[push] projectId:", projectId);

    if (!projectId) {
      console.warn("[push] projectId EAS introuvable");
      return "Configuration EAS manquante (projectId introuvable).";
    }

    console.log("[push] Appel getExpoPushTokenAsync...");
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;
    console.log("[push] Token obtenu :", pushToken);

    await apiFetch("/api/user/push-token", {
      method: "POST",
      body: JSON.stringify({ pushToken }),
    });

    console.log("[push] Token enregistré en base");
    return null; // succès
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[push] ERREUR:", msg);
    return `Erreur technique: ${msg}`;
  }
}
