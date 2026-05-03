import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, Alert, ActivityIndicator, Linking, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { getStoredUser, saveLocation, logout } from "@/lib/auth";
import { apiGet, apiPatch } from "@/lib/api";
import { LOCATIONS } from "@ludigest/types";
import type { StoredUser } from "@/lib/auth";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  nickname: string | null;
  visibleInMembers: boolean;
  matricule: string | null;
  role: string;
}

export default function AccountScreen() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [visibleInMembers, setVisibleInMembers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);

  useEffect(() => {
    getStoredUser().then(setUser);
    apiGet("/api/user/profile")
      .then((d: UserProfile) => {
        setProfile(d);
        setNickname(d.nickname ?? "");
        setVisibleInMembers(d.visibleInMembers);
      })
      .catch(() => {});
  }, []);

  async function changeLocation(loc: string) {
    if (!user || loc === user.location) return;
    setLocationSaving(true);
    try {
      await apiPatch("/api/user/location", { location: loc });
      await saveLocation(loc);
      setUser((u) => u ? { ...u, location: loc } : u);
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    }
    setLocationSaving(false);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await apiPatch("/api/user/profile", {
        nickname: nickname.trim() || null,
        visibleInMembers,
      });
      Alert.alert("Succès", "Profil mis à jour.");
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
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Infos utilisateur */}
      <View style={s.card}>
        <Text style={s.avatar}>👤</Text>
        <Text style={s.name}>{user.name}</Text>
        <Text style={s.email}>{user.email}</Text>
        <View style={[s.badge, user.role === "ADMIN" && s.badgeAdmin]}>
          <Text style={s.badgeText}>{user.role === "ADMIN" ? "Administrateur" : "Utilisateur"}</Text>
        </View>
        {profile?.matricule && (
          <Text style={s.matricule}>Matricule : {profile.matricule}</Text>
        )}
      </View>

      {/* Profil — surnom + visibilité */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Mon profil</Text>
        <Text style={s.fieldLabel}>Surnom (affiché dans la liste des membres)</Text>
        <TextInput
          style={s.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder={user.email}
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
        />
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Visible dans la liste des membres</Text>
            <Text style={s.fieldDesc}>Votre surnom et emprunts seront visibles par les autres.</Text>
          </View>
          <Switch
            value={visibleInMembers}
            onValueChange={setVisibleInMembers}
            trackColor={{ false: "#d1d5db", true: "#C8102E" }}
            thumbColor="#fff"
          />
        </View>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>Enregistrer</Text>
          }
        </TouchableOpacity>
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
              disabled={locationSaving}
            >
              {locationSaving && user.location !== loc ? (
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

      {/* Comment ça marche */}
      <TouchableOpacity
        style={s.helpBtn}
        onPress={() => Linking.openURL("https://www.ludigest.fr/comment-ca-marche")}
      >
        <Text style={s.helpText}>❓  Comment ça marche ?</Text>
      </TouchableOpacity>

      {/* Déconnexion */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: "#f9fafb", padding: 20 },
  card:                { backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  avatar:              { fontSize: 48, marginBottom: 12 },
  name:                { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 4 },
  email:               { fontSize: 13, color: "#6b7280", marginBottom: 10 },
  badge:               { backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  badgeAdmin:          { backgroundColor: "#ede9fe" },
  badgeText:           { fontSize: 12, color: "#374151", fontWeight: "600" },
  matricule:           { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  section:             { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  sectionTitle:        { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  sectionDesc:         { fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 18 },
  fieldLabel:          { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  fieldDesc:           { fontSize: 12, color: "#9ca3af", marginBottom: 4 },
  input:               { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#f9fafb", marginBottom: 16 },
  toggleRow:           { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  saveBtn:             { backgroundColor: "#C8102E", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  saveBtnDisabled:     { opacity: 0.6 },
  saveBtnText:         { color: "#fff", fontSize: 14, fontWeight: "600" },
  locationRow:         { flexDirection: "row", gap: 12 },
  locationBtn:         { flex: 1, borderWidth: 2, borderColor: "#e5e7eb", borderRadius: 14, padding: 16, alignItems: "center" },
  locationBtnActive:   { borderColor: "#C8102E", backgroundColor: "#fff5f5" },
  locationText:        { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  locationTextActive:  { color: "#C8102E", fontWeight: "700" },
  helpBtn:             { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 10 },
  helpText:            { color: "#374151", fontSize: 15, fontWeight: "500" },
  logoutBtn:           { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#fca5a5", borderRadius: 14, padding: 16, alignItems: "center" },
  logoutText:          { color: "#dc2626", fontSize: 15, fontWeight: "600" },
});
