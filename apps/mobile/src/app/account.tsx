import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Switch, StyleSheet,
  Alert, ActivityIndicator, ScrollView, RefreshControl,
} from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getStoredUser, saveLocation, logout, updateStoredUser } from "@/lib/auth";
import { apiGet, apiPatch } from "@/lib/api";
import { registerPushToken } from "@/lib/push";
import { LOCATIONS } from "@ludigest/types";
import type { StoredUser } from "@/lib/auth";

const P = {
  bg:          "#fef9f0",
  bgAlt:       "#1e1610",
  card:        "#ffffff",
  ink:         "#1e1610",
  ink2:        "#5b4d40",
  ink3:        "#9a8b7c",
  rule:        "#ece1cd",
  primary:     "#d24a1f",
  primarySoft: "#fde2d2",
  ocre:        "#e8a82f",
  vert:        "#6a8f3c",
  bleu:        "#286b7a",
};

interface UserProfile {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  nickname: string | null;
  visibleInMembers: boolean;
  matricule: string | null;
  role: string;
  location: string;
}

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

function NotifIcon({ type }: { type: string }) {
  if (type === "LOAN_REMINDER") return <Text style={nt.icon}>⏰</Text>;
  if (type === "SESSION_INVITE") return <Text style={nt.icon}>🎉</Text>;
  if (type === "SESSION_REMINDER") return <Text style={nt.icon}>📅</Text>;
  if (type === "GAME_REPORT") return <Text style={nt.icon}>🚨</Text>;
  return <Text style={nt.icon}>🔔</Text>;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Hier";
  return `Il y a ${d} j`;
}

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [visibleInMembers, setVisibleInMembers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pushActivating, setPushActivating] = useState(false);

  async function load(silent = false) {
    if (!silent) {
      const u = await getStoredUser();
      setUser(u);
    }
    try {
      const [prof, ns] = await Promise.all([
        apiGet<UserProfile>("/api/user/profile"),
        apiGet<Notif[]>("/api/user/notifications"),
      ]);
      setProfile(prof);
      setFirstName(prof.firstName ?? "");
      setLastName(prof.lastName ?? "");
      setNickname(prof.nickname ?? "");
      setVisibleInMembers(prof.visibleInMembers);
      setNotifs(ns.slice(0, 20));
    } catch {}
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, []);

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
      const updated = await apiPatch<UserProfile>("/api/user/profile", {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        nickname: nickname.trim() || null,
        visibleInMembers,
      });
      if (updated?.name) {
        await updateStoredUser({ name: updated.name });
        setUser((u) => u ? { ...u, name: updated.name } : u);
      }
      Alert.alert("Enregistré", "Vos informations ont été mises à jour.");
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    }
    setSaving(false);
  }

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  async function handleActivatePush() {
    setPushActivating(true);
    const err = await registerPushToken();
    setPushActivating(false);
    if (!err) {
      Alert.alert("Notifications activées ✓", "Vous recevrez désormais les rappels et alertes sur ce téléphone.");
    } else {
      Alert.alert("Notifications non activées", err);
    }
  }

  const initials = (() => {
    const fn = firstName || profile?.firstName || "";
    const ln = lastName || profile?.lastName || "";
    if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
    const name = user?.name ?? "";
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase() || "?";
  })();

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || user?.name || "…";

  if (!user && !profile) {
    return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={P.primary} /></View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: P.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.primary} />}
    >
      {/* Hero card */}
      <View style={[s.hero, { paddingTop: insets.top + 20 }]}>
        <Svg width={180} height={120} viewBox="0 0 200 160" style={{ position: "absolute", right: -10, top: 0, opacity: 0.15 }}>
          {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
            <Polygon
              key={`${r}-${c}`}
              points="20,2 36,12 36,30 20,40 4,30 4,12"
              translateX={c * 34 + (r % 2) * 17}
              translateY={r * 30 + 10}
              fill="none"
              stroke="#fff"
              strokeWidth="1.4"
            />
          )))}
        </Svg>
        <View style={s.heroAvatar}>
          <Text style={s.heroAvatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.heroName}>{displayName}</Text>
          <Text style={s.heroEmail}>{profile?.email ?? user?.email}</Text>
          {profile?.matricule ? (
            <Text style={s.heroMatricule}>#{profile.matricule}</Text>
          ) : null}
          <View style={s.heroRole}>
            <Text style={s.heroRoleText}>
              {profile?.role === "ADMIN" ? "Administrateur" : "Membre"}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.body}>
        {/* Identité */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Identité</Text>
          <Text style={s.cardDesc}>Vos informations affichées dans l'appli.</Text>

          <Text style={s.label}>PRÉNOM</Text>
          <TextInput
            style={s.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Prénom"
            placeholderTextColor={P.ink3}
            autoCapitalize="words"
          />

          <Text style={s.label}>NOM</Text>
          <TextInput
            style={s.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Nom"
            placeholderTextColor={P.ink3}
            autoCapitalize="words"
          />

          <Text style={s.label}>PSEUDO (affiché dans les membres)</Text>
          <TextInput
            style={s.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder={profile?.email ?? ""}
            placeholderTextColor={P.ink3}
            autoCapitalize="none"
          />

          <Text style={s.label}>EMAIL · verrouillé</Text>
          <View style={[s.input, s.inputLocked]}>
            <Text style={s.inputLockedText}>{profile?.email ?? user?.email}</Text>
          </View>

          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLabel}>Visible dans les membres</Text>
              <Text style={s.switchDesc}>Votre pseudo et emprunts sont visibles par les autres.</Text>
            </View>
            <Switch
              value={visibleInMembers}
              onValueChange={setVisibleInMembers}
              trackColor={{ false: P.rule, true: P.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnText}>Enregistrer</Text>}
          </TouchableOpacity>
        </View>

        {/* Ludothèque */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Ma ludothèque</Text>
          <Text style={s.cardDesc}>Les jeux affichés correspondent à la ludothèque sélectionnée.</Text>
          <View style={s.locationRow}>
            {LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[s.locationBtn, (user?.location === loc) && s.locationBtnActive]}
                onPress={() => changeLocation(loc)}
                disabled={locationSaving}
              >
                {locationSaving && user?.location !== loc
                  ? <ActivityIndicator size="small" color={P.primary} />
                  : <Text style={[s.locationText, (user?.location === loc) && s.locationTextActive]}>📍 {loc}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        {notifs.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Notifications</Text>
            {notifs.map((n, i) => (
              <View
                key={n.id}
                style={[nt.row, i > 0 && { borderTopWidth: 1, borderTopColor: P.rule }, !n.read && { backgroundColor: P.primarySoft }]}
              >
                <NotifIcon type={n.type} />
                <View style={{ flex: 1 }}>
                  <Text style={[nt.title, !n.read && { color: P.primary }]} numberOfLines={1}>{n.title}</Text>
                  <Text style={nt.msg} numberOfLines={2}>{n.message}</Text>
                </View>
                <Text style={nt.time}>{timeAgo(n.createdAt)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notifications push */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Notifications push</Text>
          <Text style={s.cardDesc}>Recevez des rappels d'emprunt et alertes directement sur votre téléphone.</Text>
          <TouchableOpacity
            style={[s.saveBtn, pushActivating && { opacity: 0.6 }]}
            onPress={handleActivatePush}
            disabled={pushActivating}
          >
            {pushActivating
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnText}>🔔 Activer les notifications</Text>}
          </TouchableOpacity>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero:          { backgroundColor: P.bgAlt, padding: 20, paddingBottom: 28, flexDirection: "row", gap: 18, alignItems: "center", overflow: "hidden" },
  heroAvatar:    { width: 72, height: 72, borderRadius: 18, backgroundColor: P.ocre, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroAvatarText:{ fontSize: 30, fontWeight: "700", color: P.bgAlt },
  heroName:      { fontSize: 20, fontWeight: "700", color: "#fff", letterSpacing: -0.4 },
  heroEmail:     { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  heroMatricule: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 },
  heroRole:      { marginTop: 8, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  heroRoleText:  { fontSize: 10, fontWeight: "700", color: P.ocre },

  body:          { padding: 14, gap: 12 },
  card:          { backgroundColor: P.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: P.rule },
  cardTitle:     { fontSize: 16, fontWeight: "700", color: P.ink, marginBottom: 4 },
  cardDesc:      { fontSize: 12, color: P.ink3, marginBottom: 16 },

  label:         { fontSize: 10, fontWeight: "700", color: P.ink3, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 },
  input:         { borderWidth: 1.5, borderColor: P.rule, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: P.ink, backgroundColor: P.bg, marginBottom: 14 },
  inputLocked:   { backgroundColor: P.bg, justifyContent: "center" },
  inputLockedText:{ fontSize: 14, color: P.ink3, fontWeight: "500" },
  switchRow:     { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  switchLabel:   { fontSize: 13, fontWeight: "600", color: P.ink },
  switchDesc:    { fontSize: 11, color: P.ink3, marginTop: 2 },
  saveBtn:       { backgroundColor: P.ink, borderRadius: 100, paddingVertical: 12, alignItems: "center" },
  saveBtnText:   { color: "#fff", fontSize: 14, fontWeight: "700" },

  locationRow:   { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  locationBtn:   { flex: 1, borderWidth: 1.5, borderColor: P.rule, borderRadius: 12, padding: 14, alignItems: "center" },
  locationBtnActive: { borderColor: P.primary, backgroundColor: P.primarySoft },
  locationText:  { fontSize: 13, color: P.ink2, fontWeight: "500" },
  locationTextActive: { color: P.primary, fontWeight: "700" },

  logoutBtn:     { borderWidth: 1.5, borderColor: "#fca5a5", borderRadius: 14, padding: 16, alignItems: "center" },
  logoutText:    { color: "#dc2626", fontSize: 15, fontWeight: "600" },
});

const nt = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  icon:  { fontSize: 18, width: 26, textAlign: "center" },
  title: { fontSize: 13, fontWeight: "700", color: P.ink },
  msg:   { fontSize: 11, color: P.ink3, marginTop: 2, lineHeight: 16 },
  time:  { fontSize: 10, color: P.ink3, marginTop: 2, flexShrink: 0 },
});
