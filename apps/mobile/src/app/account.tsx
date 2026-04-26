import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getStoredUser, saveLocation, logout } from "@/lib/auth";
import { apiPatch } from "@/lib/api";
import { LOCATIONS } from "@ludigest/types";
import type { StoredUser } from "@/lib/auth";

export default function AccountScreen() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getStoredUser().then(setUser); }, []);

  async function changeLocation(loc: string) {
    if (!user || loc === user.location) return;
    setSaving(true);
    try {
      await apiPatch("/api/user/location", { location: loc });
      await saveLocation(loc);
      setUser((u) => u ? { ...u, location: loc } : u);
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    }
    setSaving(false);
  }

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  if (!user) return <ActivityIndicator style={{ marginTop: 60 }} color="#C8102E" />;

  return (
    <View style={s.container}>
      {/* Infos utilisateur */}
      <View style={s.card}>
        <Text style={s.avatar}>👤</Text>
        <Text style={s.name}>{user.name}</Text>
        <Text style={s.email}>{user.email}</Text>
        <View style={[s.badge, user.role === "ADMIN" && s.badgeAdmin]}>
          <Text style={s.badgeText}>{user.role === "ADMIN" ? "Administrateur" : "Utilisateur"}</Text>
        </View>
      </View>

      {/* Choix ludothèque */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Ma ludothèque</Text>
        <Text style={s.sectionDesc}>Les jeux affichés correspondent à la ludothèque sélectionnée.</Text>
        <View style={s.locationRow}>
          {LOCATIONS.map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[s.locationBtn, user.location === loc && s.locationBtnActive]}
              onPress={() => changeLocation(loc)}
              disabled={saving}
            >
              {saving && user.location !== loc ? (
                <ActivityIndicator size="small" color="#C8102E" />
              ) : (
                <Text style={[s.locationText, user.location === loc && s.locationTextActive]}>
                  📍 {loc}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: "#f9fafb", padding: 20 },
  card:                { backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  avatar:              { fontSize: 48, marginBottom: 12 },
  name:                { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 4 },
  email:               { fontSize: 13, color: "#6b7280", marginBottom: 10 },
  badge:               { backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeAdmin:          { backgroundColor: "#ede9fe" },
  badgeText:           { fontSize: 12, color: "#374151", fontWeight: "600" },
  section:             { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  sectionTitle:        { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  sectionDesc:         { fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 18 },
  locationRow:         { flexDirection: "row", gap: 12 },
  locationBtn:         { flex: 1, borderWidth: 2, borderColor: "#e5e7eb", borderRadius: 14, padding: 16, alignItems: "center" },
  locationBtnActive:   { borderColor: "#C8102E", backgroundColor: "#fff5f5" },
  locationText:        { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  locationTextActive:  { color: "#C8102E", fontWeight: "700" },
  logoutBtn:           { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#fca5a5", borderRadius: 14, padding: 16, alignItems: "center" },
  logoutText:          { color: "#dc2626", fontSize: 15, fontWeight: "600" },
});
