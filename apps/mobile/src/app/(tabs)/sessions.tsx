import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, Image, RefreshControl,
} from "react-native";
import { apiGet, apiFetch } from "@/lib/api";
import type { GameSessionDTO } from "@ludigest/types";

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

const TINTS = ["#d24a1f", "#e8a82f", "#6a8f3c", "#286b7a", "#c54a7a", "#3a5a8c"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function isPast(iso: string) { return new Date(iso) < new Date(); }

export default function SessionsScreen() {
  const [sessions, setSessions] = useState<GameSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);
  const [guestInput, setGuestInput] = useState<{ id: string; value: string } | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await apiGet<GameSessionDTO[]>("/api/sessions");
      setSessions(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    apiFetch("/api/user/notifications/read-sessions", { method: "POST" }).catch(() => {});
  }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, []);

  async function register(session: GameSessionDTO, guestName: string) {
    setRegistering(session.id);
    try {
      const res = await apiFetch(`/api/sessions/${session.id}/register`, {
        method: "POST",
        body: JSON.stringify({ guestName: guestName.trim() || null }),
      });
      if (res.ok) { load(true); setGuestInput(null); }
      else { const d = await res.json(); Alert.alert("Erreur", d.error ?? "Erreur."); }
    } catch { Alert.alert("Erreur", "Problème réseau."); }
    setRegistering(null);
  }

  async function unregister(session: GameSessionDTO) {
    Alert.alert("Se désinscrire", `Vous désinscrire de "${session.name}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se désinscrire", style: "destructive",
        onPress: async () => {
          setRegistering(session.id);
          try {
            const res = await apiFetch(`/api/sessions/${session.id}/register`, { method: "DELETE" });
            if (res.ok) load(true);
            else { const d = await res.json(); Alert.alert("Erreur", d.error ?? "Erreur."); }
          } catch { Alert.alert("Erreur", "Problème réseau."); }
          setRegistering(null);
        },
      },
    ]);
  }

  const upcoming = sessions.filter((s) => !isPast(s.date));
  const past = sessions.filter((s) => isPast(s.date));

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color={P.primary} />;

  return (
    <ScrollView
      style={st.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.primary} />}
    >
      {sessions.length === 0 ? (
        <View style={st.empty}>
          <Text style={st.emptyEmoji}>🎲</Text>
          <Text style={st.emptyText}>Aucune soirée prévue pour l'instant.</Text>
        </View>
      ) : (
        <>
          {upcoming.map((session, idx) => {
            const registered = !!session.myRegistration;
            const isGuestInput = guestInput?.id === session.id;
            const busy = registering === session.id;
            const tint = TINTS[idx % TINTS.length];
            return (
              <View key={session.id} style={[st.card, registered && { borderColor: P.vert, borderWidth: 1.5 }]}>
                {/* Colored band / image */}
                {session.imageUrl ? (
                  <Image source={{ uri: session.imageUrl }} style={st.image} resizeMode="cover" />
                ) : (
                  <View style={[st.colorBand, { backgroundColor: tint }]}>
                    <Text style={st.colorBandEmoji}>🎲</Text>
                  </View>
                )}

                <View style={st.body}>
                  <View style={st.row}>
                    <Text style={st.name} numberOfLines={2}>{session.name}</Text>
                    {registered && (
                      <View style={[st.badge, { backgroundColor: P.vert + "22" }]}>
                        <Text style={[st.badgeText, { color: P.vert }]}>✓ Inscrit(e)</Text>
                      </View>
                    )}
                  </View>

                  <Text style={st.meta}>📅 {formatDate(session.date)}</Text>
                  <Text style={st.meta}>🕐 {session.startTime}  ·  📍 {session.location}</Text>

                  {/* Registration count pill */}
                  <View style={st.countPill}>
                    <Text style={st.countText}>👥 {session.registrationCount} inscrit{session.registrationCount > 1 ? "s" : ""}</Text>
                  </View>

                  {session.myRegistration?.guestName ? (
                    <Text style={st.guest}>Avec : {session.myRegistration.guestName}</Text>
                  ) : null}
                  {session.info ? <Text style={st.info}>{session.info}</Text> : null}

                  {busy ? (
                    <ActivityIndicator style={{ marginTop: 12 }} color={P.primary} />
                  ) : registered ? (
                    <TouchableOpacity style={st.btnOutline} onPress={() => unregister(session)}>
                      <Text style={st.btnOutlineText}>Se désinscrire</Text>
                    </TouchableOpacity>
                  ) : isGuestInput ? (
                    <View style={st.guestBox}>
                      <TextInput
                        style={st.guestInput}
                        placeholder="Accompagnant(e) ? (optionnel)"
                        placeholderTextColor={P.ink3}
                        value={guestInput.value}
                        onChangeText={(v) => setGuestInput({ id: session.id, value: v })}
                        autoFocus
                      />
                      <View style={st.guestActions}>
                        <TouchableOpacity style={st.btnCancel} onPress={() => setGuestInput(null)}>
                          <Text style={st.btnCancelText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[st.btnPrimary, { backgroundColor: tint }]} onPress={() => register(session, guestInput.value)}>
                          <Text style={st.btnPrimaryText}>Confirmer</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={[st.btnPrimary, { backgroundColor: tint }]} onPress={() => setGuestInput({ id: session.id, value: "" })}>
                      <Text style={st.btnPrimaryText}>S'inscrire</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {past.length > 0 && (
            <>
              <Text style={st.pastTitle}>Sessions passées</Text>
              {past.map((p) => (
                <View key={p.id} style={st.pastCard}>
                  <Text style={st.pastName}>{p.name}</Text>
                  <Text style={st.pastMeta}>{formatDate(p.date)}  ·  {p.registrationCount} inscrit(s)</Text>
                  {p.myRegistration && <Text style={[st.pastBadge, { color: P.vert }]}>✓ Vous étiez inscrit(e)</Text>}
                </View>
              ))}
            </>
          )}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container:    { flex: 1, backgroundColor: P.bg },
  empty:        { alignItems: "center", marginTop: 80 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyText:    { color: P.ink3, fontSize: 15 },
  card:         { backgroundColor: P.card, borderRadius: 20, margin: 16, marginBottom: 8, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  colorBand:    { width: "100%", height: 96, alignItems: "center", justifyContent: "center" },
  colorBandEmoji: { fontSize: 36, opacity: 0.4 },
  image:        { width: "100%", height: 140 },
  body:         { padding: 16 },
  row:          { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 },
  name:         { fontSize: 18, fontWeight: "700", color: P.ink, flex: 1, lineHeight: 24 },
  badge:        { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  badgeText:    { fontSize: 11, fontWeight: "700" },
  meta:         { fontSize: 13, color: P.ink2, marginBottom: 2 },
  countPill:    { flexDirection: "row", alignSelf: "flex-start", backgroundColor: P.bgAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, marginBottom: 2 },
  countText:    { fontSize: 12, color: "#fff", fontWeight: "600" },
  guest:        { fontSize: 13, color: P.ink2, marginTop: 4 },
  info:         { fontSize: 13, color: P.ink3, marginTop: 6, lineHeight: 18 },
  btnPrimary:   { borderRadius: 100, padding: 12, alignItems: "center", marginTop: 12 },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnOutline:   { borderWidth: 1.5, borderColor: P.primary, borderRadius: 100, padding: 12, alignItems: "center", marginTop: 12 },
  btnOutlineText: { color: P.primary, fontWeight: "600", fontSize: 14 },
  btnCancel:    { flex: 1, borderWidth: 1, borderColor: P.rule, borderRadius: 100, padding: 10, alignItems: "center" },
  btnCancelText: { color: P.ink3, fontWeight: "500", fontSize: 14 },
  guestBox:     { marginTop: 12 },
  guestInput:   { backgroundColor: P.bg, borderWidth: 1, borderColor: P.rule, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 8, color: P.ink },
  guestActions: { flexDirection: "row", gap: 8 },
  pastTitle:    { fontSize: 13, fontWeight: "700", color: P.ink3, paddingHorizontal: 16, paddingTop: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 },
  pastCard:     { backgroundColor: P.bg, borderRadius: 14, marginHorizontal: 16, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: P.rule },
  pastName:     { fontSize: 15, fontWeight: "600", color: P.ink2 },
  pastMeta:     { fontSize: 12, color: P.ink3, marginTop: 2 },
  pastBadge:    { fontSize: 12, marginTop: 4, fontWeight: "600" },
});
