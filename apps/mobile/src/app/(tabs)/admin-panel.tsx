import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet } from "@/lib/api";
import { PhoneHeader } from "@/components/PhoneHeader";
import { Pion, type PionKind } from "@/components/Pion";

const P = {
  bg:          "#fef9f0",
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

const LINKS: {
  label: string;
  kind: PionKind;
  tint: string;
  action: "local" | "web";
  route?: string;
  url?: string;
  tag: "APP" | "WEB";
}[] = [
  { label: "Ajouter un jeu",     kind: "die",    tint: P.primary, action: "local", route: "/admin/add-game",              tag: "APP" },
  { label: "Gérer les jeux",     kind: "meeple", tint: P.ocre,    action: "web",   url: `${WEB_ADMIN}/games`,             tag: "WEB" },
  { label: "Gérer les emprunts", kind: "hex",    tint: P.bleu,    action: "web",   url: `${WEB_ADMIN}/loans`,             tag: "WEB" },
  { label: "Utilisateurs",       kind: "chip",   tint: "#5b4d40", action: "web",   url: `${WEB_ADMIN}/users`,             tag: "WEB" },
  { label: "Sessions ludiques",  kind: "star",   tint: P.vert,    action: "web",   url: `${WEB_ADMIN}/sessions`,          tag: "WEB" },
  { label: "Paramètres email",   kind: "card",   tint: P.bleu,    action: "web",   url: `${WEB_ADMIN}/email-settings`,   tag: "WEB" },
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
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      <PhoneHeader title="Admin" subtitle="Panneau d'administration" accent="#1e1610" />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* KPI grid */}
        <View style={st.kpiGrid}>
          {stats ? (
            <>
              <View style={[st.kpiCard, { backgroundColor: "#e8f3dc" }]}>
                <Pion tint={P.vert} kind="die" w={36} h={36} />
                <Text style={[st.kpiValue, { color: "#3d5a1a" }]}>{stats.totalGames}</Text>
                <Text style={[st.kpiLabel, { color: "#3d5a1a" }]}>Jeux</Text>
              </View>
              <View style={[st.kpiCard, { backgroundColor: "#fcebd2" }]}>
                <Pion tint={P.ocre} kind="hex" w={36} h={36} />
                <Text style={[st.kpiValue, { color: "#7d4a0d" }]}>{stats.activeLoans}</Text>
                <Text style={[st.kpiLabel, { color: "#7d4a0d" }]}>Emprunts</Text>
              </View>
              <View style={[st.kpiCard, { backgroundColor: stats.overdueLoans > 0 ? P.primarySoft : P.bg }]}>
                <Pion tint={stats.overdueLoans > 0 ? P.primary : P.ink3} kind="card" w={36} h={36} />
                <Text style={[st.kpiValue, { color: stats.overdueLoans > 0 ? P.primary : P.ink3 }]}>
                  {stats.overdueLoans}
                </Text>
                <Text style={[st.kpiLabel, { color: stats.overdueLoans > 0 ? "#7c2410" : P.ink3 }]}>En retard</Text>
              </View>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: "center", paddingVertical: 24 }}>
              <ActivityIndicator color={P.primary} />
            </View>
          )}
        </View>

        {/* Actions */}
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
              <Pion tint={item.tint} kind={item.kind} w={44} h={44} />
              <Text style={st.linkLabel}>{item.label}</Text>
              <View style={[
                st.tag,
                item.tag === "APP" ? { backgroundColor: P.bleu + "22" } : { backgroundColor: P.ocre + "22" },
              ]}>
                <Text style={[st.tagText, { color: item.tag === "APP" ? P.bleu : "#7d4a0d" }]}>
                  {item.tag}
                </Text>
              </View>
              <Text style={st.arrow}>{item.action === "local" ? "›" : "↗"}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  kpiGrid:     { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8 },
  kpiCard:     { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 6 },
  kpiValue:    { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  kpiLabel:    { fontSize: 11, fontWeight: "600" },

  sectionLabel:{ fontSize: 11, fontWeight: "700", color: P.ink3, textTransform: "uppercase", letterSpacing: 1.2, paddingHorizontal: 16, marginTop: 12, marginBottom: 8 },
  linksCard:   { backgroundColor: P.card, marginHorizontal: 16, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: P.rule },
  linkRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  linkLabel:   { flex: 1, fontSize: 15, color: P.ink, fontWeight: "600" },
  tag:         { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:     { fontSize: 10, fontWeight: "700" },
  arrow:       { fontSize: 18, color: P.ink3 },
});
