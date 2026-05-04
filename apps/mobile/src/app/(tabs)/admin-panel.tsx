import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { apiGet } from "@/lib/api";

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

const WEB_ADMIN = "https://www.ludigest.fr/admin";

const LINKS = [
  { label: "Ajouter un jeu",         icon: "➕", action: "local" as const, route: "/admin/add-game",         tag: "APP" },
  { label: "Gérer les jeux",         icon: "🎲", action: "web"   as const, url: `${WEB_ADMIN}/games`,         tag: "WEB" },
  { label: "Gérer les emprunts",     icon: "📚", action: "web"   as const, url: `${WEB_ADMIN}/loans`,         tag: "WEB" },
  { label: "Utilisateurs",           icon: "👥", action: "web"   as const, url: `${WEB_ADMIN}/users`,         tag: "WEB" },
  { label: "Soirées ludiques",       icon: "🎉", action: "web"   as const, url: `${WEB_ADMIN}/sessions`,      tag: "WEB" },
  { label: "Paramètres email",       icon: "📧", action: "web"   as const, url: `${WEB_ADMIN}/email-settings`,tag: "WEB" },
];

interface Stats {
  totalGames: number;
  activeLoans: number;
  overdueLoans: number;
}

export default function AdminPanel() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiGet<Stats>("/api/admin/stats").then((d) => setStats(d)).catch(() => {});
  }, []);

  return (
    <ScrollView style={st.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.headerLabel}>Administration</Text>
        <Text style={st.headerTitle}>Panneau admin</Text>
        <Text style={st.headerSub}>Les actions WEB s'ouvrent dans le navigateur.</Text>
      </View>

      {/* KPI grid */}
      {stats ? (
        <View style={st.kpiGrid}>
          <View style={[st.kpiCard, { backgroundColor: "#e8f3dc" }]}>
            <Text style={st.kpiIcon}>🎲</Text>
            <Text style={[st.kpiValue, { color: "#3d5a1a" }]}>{stats.totalGames}</Text>
            <Text style={[st.kpiLabel, { color: "#3d5a1a" }]}>Jeux</Text>
          </View>
          <View style={[st.kpiCard, { backgroundColor: "#fcebd2" }]}>
            <Text style={st.kpiIcon}>📚</Text>
            <Text style={[st.kpiValue, { color: "#7d4a0d" }]}>{stats.activeLoans}</Text>
            <Text style={[st.kpiLabel, { color: "#7d4a0d" }]}>Emprunts</Text>
          </View>
          <View style={[st.kpiCard, { backgroundColor: stats.overdueLoans > 0 ? P.primarySoft : P.bg }]}>
            <Text style={st.kpiIcon}>⚠️</Text>
            <Text style={[st.kpiValue, { color: stats.overdueLoans > 0 ? P.primary : P.ink3 }]}>{stats.overdueLoans}</Text>
            <Text style={[st.kpiLabel, { color: stats.overdueLoans > 0 ? "#7c2410" : P.ink3 }]}>En retard</Text>
          </View>
        </View>
      ) : (
        <ActivityIndicator style={{ marginVertical: 24 }} color={P.primary} />
      )}

      {/* Links */}
      <Text style={st.sectionLabel}>Actions</Text>
      <View style={st.linksCard}>
        {LINKS.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[st.linkRow, i > 0 && { borderTopWidth: 1, borderTopColor: P.rule }]}
            onPress={() =>
              item.action === "local"
                ? router.push(item.route as any)
                : Linking.openURL(item.url!)
            }
          >
            <View style={st.linkIcon}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <Text style={st.linkLabel}>{item.label}</Text>
            <View style={[st.tag, item.tag === "APP" ? { backgroundColor: P.bleu + "22" } : { backgroundColor: P.ocre + "22" }]}>
              <Text style={[st.tagText, { color: item.tag === "APP" ? P.bleu : "#7d4a0d" }]}>{item.tag}</Text>
            </View>
            <Text style={st.arrow}>{item.action === "local" ? "›" : "↗"}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container:   { flex: 1, backgroundColor: P.bg },
  header:      { padding: 24, paddingBottom: 8 },
  headerLabel: { fontSize: 11, fontWeight: "700", color: P.ink3, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: P.ink, marginBottom: 4 },
  headerSub:   { fontSize: 13, color: P.ink3 },
  kpiGrid:     { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  kpiCard:     { flex: 1, borderRadius: 16, padding: 14, alignItems: "center" },
  kpiIcon:     { fontSize: 22, marginBottom: 4 },
  kpiValue:    { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  kpiLabel:    { fontSize: 11, fontWeight: "600", marginTop: 2 },
  sectionLabel:{ fontSize: 11, fontWeight: "700", color: P.ink3, textTransform: "uppercase", letterSpacing: 1.2, paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
  linksCard:   { backgroundColor: P.card, marginHorizontal: 16, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: P.rule },
  linkRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  linkIcon:    { width: 36, height: 36, borderRadius: 10, backgroundColor: P.bg, alignItems: "center", justifyContent: "center" },
  linkLabel:   { flex: 1, fontSize: 15, color: P.ink, fontWeight: "600" },
  tag:         { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:     { fontSize: 10, fontWeight: "700" },
  arrow:       { fontSize: 18, color: P.ink3 },
});
