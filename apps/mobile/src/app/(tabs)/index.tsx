import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polygon } from "react-native-svg";
import { apiGet, apiPost } from "@/lib/api";
import { getStoredUser, getStoredLocation, updateStoredUser } from "@/lib/auth";
import { Pion, CAT_PION } from "@/components/Pion";
import type { GameDTO, LoanDTO, GameSessionDTO } from "@ludigest/types";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TINTS = ["#d24a1f", "#e8a82f", "#6a8f3c", "#286b7a", "#c54a7a", "#3a5a8c"];

const CAT_COLOR: Record<string, string> = {
  escape: "#d24a1f", famille: "#e8a82f", ambiance: "#286b7a",
  enfant: "#f4c430", "initié": "#5b4d40", expert: "#6a8f3c",
};

function hashTint(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return TINTS[h % TINTS.length];
}

function formatDue(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  if (days <= 0) return "En retard";
  if (days === 1) return "Demain";
  return `Dans ${days} jours`;
}

function isDueSoon(iso: string): boolean {
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 && ms <= 7 * 86400000;
}

function HeroHexPattern() {
  const hexes: { r: number; c: number }[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) hexes.push({ r, c });
  return (
    <Svg width={200} height={160} viewBox="0 0 200 160"
      style={{ position: "absolute", right: -30, top: -10, opacity: 0.15 }}>
      {hexes.map(({ r, c }) => (
        <Polygon key={`${r}-${c}`}
          points="20,2 36,12 36,30 20,40 4,30 4,12"
          fill="none" stroke="#fff" strokeWidth="1"
          translateX={c * 34 + (r % 2) * 17}
          translateY={r * 30}
        />
      ))}
    </Svg>
  );
}

export default function HomeTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");
  const [initials, setInitials] = useState("?");
  const [location, setLocation] = useState("");
  const [activeLoans, setActiveLoans] = useState<LoanDTO[]>([]);
  const [upcomingSession, setUpcomingSession] = useState<GameSessionDTO | null>(null);
  const [suggestions, setSuggestions] = useState<GameDTO[]>([]);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const [user, loc] = await Promise.all([getStoredUser(), getStoredLocation()]);
    setLocation(loc);

    function applyName(name: string) {
      const parts = name.trim().split(/\s+/);
      setUserName(parts[0]);
      setInitials(parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase());
    }
    if (user?.name) applyName(user.name);

    try {
      const [loans, sessions, games, profile] = await Promise.all([
        apiGet<LoanDTO[]>("/api/loans?all=true"),
        apiGet<GameSessionDTO[]>("/api/sessions"),
        apiGet<GameDTO[]>(`/api/games?location=${encodeURIComponent(loc)}&status=AVAILABLE`),
        apiGet<{ name: string }>("/api/user/profile"),
      ]);
      setActiveLoans(loans.filter((l) => !l.returnedAt));
      const upcoming = sessions
        .filter((s) => new Date(s.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
      setUpcomingSession(upcoming);
      setSuggestions(games.sort(() => Math.random() - 0.5).slice(0, 8));
      if (profile?.name && profile.name !== user?.name) {
        applyName(profile.name);
        await updateStoredUser({ name: profile.name });
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  async function extendLoan(loanId: string) {
    try {
      await apiPost(`/api/loans/${loanId}/extend`, {});
      load();
    } catch {}
  }

  const today = DAYS[new Date().getDay()];

  const TILES = [
    { label: "Catalogue", tint: "#286b7a", kind: "die" as const, onPress: () => router.push("/(tabs)/games") },
    { label: "Emprunter", tint: "#d24a1f", kind: "card" as const, onPress: () => router.push("/(tabs)/scan") },
    { label: "Mes emprunts", tint: "#6a8f3c", kind: "hex" as const, onPress: () => router.push("/(tabs)/loans") },
    { label: "Sessions", tint: "#e8a82f", kind: "star" as const, onPress: () => router.push("/(tabs)/sessions") },
  ];

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: "#fef9f0", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color="#d24a1f" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fef9f0" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#d24a1f" />}
      >
        {/* Hero sombre */}
        <View style={[s.hero, { paddingTop: insets.top + 18 }]}>
          <HeroHexPattern />
          <View style={s.heroTop}>
            <View style={s.heroLogo}>
              <View style={s.logoSquare}><Text style={s.logoL}>L</Text></View>
              <Text style={s.logoText}>Ludigest</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/account")} style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 18 }}>
            <Text style={s.heroLocation}>📍 {location || "…"} · {today}</Text>
            <Text style={s.heroGreeting}>Salut {userName || "…"},{"\n"}on joue à quoi ?</Text>
          </View>
          <TouchableOpacity style={s.searchBar} onPress={() => router.push("/(tabs)/games")} activeOpacity={0.8}>
            <Text style={s.searchIcon}>🔍</Text>
            <Text style={s.searchPlaceholder}>Chercher un jeu…</Text>
          </TouchableOpacity>
        </View>

        {/* Tiles */}
        <View style={s.tilesRow}>
          {TILES.map((tile) => (
            <TouchableOpacity key={tile.label} style={s.tile} onPress={tile.onPress} activeOpacity={0.8}>
              <Pion tint={tile.tint} kind={tile.kind} w={52} h={52} />
              <Text style={s.tileLabel}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Prochaine session */}
        {upcomingSession && (
          <View style={s.section}>
            <View style={s.sessionCard}>
              <View style={s.sessionPionBg}>
                <Pion tint="#fff" kind="star" w={100} h={100} />
              </View>
              <Text style={s.sessionLabel}>· {new Date(upcomingSession.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</Text>
              <Text style={s.sessionTitle}>{upcomingSession.name}</Text>
              <Text style={s.sessionMeta}>
                {upcomingSession.registrationCount}{upcomingSession.maxParticipants ? ` / ${upcomingSession.maxParticipants}` : ""} inscrits · {upcomingSession.location}
              </Text>
              {upcomingSession.myRegistration ? (
                <View style={s.sessionRegistered}>
                  <Text style={s.sessionRegisteredText}>✓ Inscrit·e</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.sessionCTA}
                  onPress={() => router.push("/(tabs)/sessions")}
                >
                  <Text style={s.sessionCTAText}>Je m'inscris →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Sur ma table */}
        {activeLoans.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Sur ma table</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/loans")}>
                <Text style={s.sectionLink}>Tout voir</Text>
              </TouchableOpacity>
            </View>
            {activeLoans.slice(0, 3).map((loan) => {
              const overdue = new Date(loan.dueAt) < new Date();
              const soon = isDueSoon(loan.dueAt);
              const dueLabel = formatDue(loan.dueAt);
              return (
                <TouchableOpacity key={loan.id} style={s.loanRow} onPress={() => router.push(`/game/${loan.gameId}`)} activeOpacity={0.8}>
                  {loan.gameCoverUrl ? (
                    <Image source={{ uri: loan.gameCoverUrl }} style={s.loanThumb} resizeMode="cover" />
                  ) : (
                    <View style={[s.loanThumb, { backgroundColor: hashTint(loan.gameName), alignItems: "center", justifyContent: "center" }]}>
                      <Pion tint={hashTint(loan.gameName)} kind="meeple" w={26} h={26} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.loanName}>{loan.gameName}</Text>
                    <Text style={[s.loanDue, overdue ? s.dueBad : soon ? s.dueSoon : null]}>
                      À rendre · {dueLabel}
                    </Text>
                  </View>
                  {loan.extendedCount < 3 && (
                    <TouchableOpacity style={s.extendBtn} onPress={() => extendLoan(loan.id)}>
                      <Text style={s.extendBtnText}>+ 7 j</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* À découvrir */}
        {suggestions.length > 0 && (
          <View style={[s.section, { paddingBottom: 32 }]}>
            <Text style={[s.sectionTitle, { marginBottom: 10 }]}>À découvrir</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {suggestions.map((game) => {
                const color = CAT_COLOR[game.category] ?? hashTint(game.name);
                return (
                  <TouchableOpacity key={game.id} style={s.suggCard} onPress={() => router.push(`/game/${game.id}`)} activeOpacity={0.85}>
                    {game.coverUrl ? (
                      <Image source={{ uri: game.coverUrl }} style={s.suggVisual} resizeMode="cover" />
                    ) : (
                      <View style={[s.suggVisual, { backgroundColor: color, alignItems: "center", justifyContent: "center" }]}>
                        <Pion tint={color} kind={CAT_PION[game.category] ?? "meeple"} w={60} h={60} />
                      </View>
                    )}
                    <View style={s.suggBody}>
                      <Text style={s.suggName} numberOfLines={2}>{game.name}</Text>
                      <Text style={s.suggCat}>{game.category}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* FAB scanner */}
      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => router.push("/(tabs)/scan")}
        activeOpacity={0.85}
      >
        <Text style={s.fabIcon}>📷</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  hero:             { backgroundColor: "#1e1610", paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  heroTop:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLogo:         { flexDirection: "row", alignItems: "center", gap: 8 },
  logoSquare:       { width: 28, height: 28, borderRadius: 8, backgroundColor: "#d24a1f", alignItems: "center", justifyContent: "center" },
  logoL:            { color: "#fff", fontSize: 16, fontWeight: "700" },
  logoText:         { color: "#fff", fontSize: 18, fontWeight: "700" },
  avatar:           { width: 32, height: 32, borderRadius: 16, backgroundColor: "#e8a82f", alignItems: "center", justifyContent: "center" },
  avatarText:       { color: "#1e1610", fontSize: 11, fontWeight: "700" },
  heroLocation:     { color: "#e8a82f", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  heroGreeting:     { color: "#fff", fontSize: 26, fontWeight: "700", lineHeight: 30, letterSpacing: -0.8, marginTop: 4 },
  searchBar:        { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 100 },
  searchIcon:       { fontSize: 13 },
  searchPlaceholder:{ color: "rgba(255,255,255,0.7)", fontSize: 13 },
  tilesRow:         { flexDirection: "row", padding: 20, paddingBottom: 4, gap: 8 },
  tile:             { flex: 1, alignItems: "center", gap: 6 },
  tileLabel:        { fontSize: 10, fontWeight: "700", color: "#1e1610", textAlign: "center", lineHeight: 13 },
  section:          { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeader:    { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle:     { fontSize: 18, fontWeight: "700", color: "#1e1610", letterSpacing: -0.3 },
  sectionLink:      { fontSize: 12, fontWeight: "700", color: "#d24a1f" },
  sessionCard:      { backgroundColor: "#d24a1f", borderRadius: 16, padding: 16, overflow: "hidden", position: "relative" },
  sessionPionBg:    { position: "absolute", right: -20, bottom: -20, opacity: 0.2 },
  sessionLabel:     { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700", letterSpacing: 0.2, textTransform: "uppercase" },
  sessionTitle:     { color: "#fff", fontSize: 22, fontWeight: "700", marginTop: 4, letterSpacing: -0.5, lineHeight: 26 },
  sessionMeta:      { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4 },
  sessionRegistered:{ marginTop: 10, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  sessionRegisteredText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  sessionCTA:       { marginTop: 12, alignSelf: "flex-start", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  sessionCTAText:   { color: "#d24a1f", fontSize: 12, fontWeight: "700" },
  loanRow:          { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ece1cd", borderRadius: 14, marginBottom: 8 },
  loanThumb:        { width: 44, height: 44, borderRadius: 10 },
  loanName:         { fontSize: 14, fontWeight: "700", color: "#1e1610" },
  loanDue:          { fontSize: 12, color: "#9a8b7c", marginTop: 2 },
  dueBad:           { color: "#c44", fontWeight: "600" },
  dueSoon:          { color: "#d24a1f", fontWeight: "600" },
  extendBtn:        { borderWidth: 1.5, borderColor: "#1e1610", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  extendBtnText:    { fontSize: 11, fontWeight: "700", color: "#1e1610" },
  suggCard:         { width: 120, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#ece1cd" },
  suggVisual:       { width: 120, height: 120 },
  suggBody:         { paddingHorizontal: 10, paddingVertical: 8 },
  suggName:         { fontSize: 12, fontWeight: "700", color: "#1e1610", lineHeight: 16 },
  suggCat:          { fontSize: 10, color: "#9a8b7c", marginTop: 2, textTransform: "capitalize" },
  fab:              { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#d24a1f", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabIcon:          { fontSize: 22 },
});
