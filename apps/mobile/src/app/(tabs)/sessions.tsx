import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, Image, RefreshControl,
} from "react-native";
import { apiGet, apiFetch } from "@/lib/api";
import type { GameSessionDTO } from "@ludigest/types";

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
    // Mark session notifications as read
    apiFetch("/api/user/notifications/read-sessions", { method: "POST" }).catch(() => {});
  }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, []);

  async function register(s: GameSessionDTO, guestName: string) {
    setRegistering(s.id);
    try {
      const res = await apiFetch(`/api/sessions/${s.id}/register`, {
        method: "POST",
        body: JSON.stringify({ guestName: guestName.trim() || null }),
      });
      if (res.ok) { load(true); setGuestInput(null); }
      else { const d = await res.json(); Alert.alert("Erreur", d.error ?? "Erreur."); }
    } catch { Alert.alert("Erreur", "Problème réseau."); }
    setRegistering(null);
  }

  async function unregister(s: GameSessionDTO) {
    Alert.alert("Se désinscrire", `Vous désinscrire de "${s.name}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se désinscrire", style: "destructive",
        onPress: async () => {
          setRegistering(s.id);
          try {
            const res = await apiFetch(`/api/sessions/${s.id}/register`, { method: "DELETE" });
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

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#C8102E" />;

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8102E" />}
    >
      {sessions.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🎲</Text>
          <Text style={s.emptyText}>Aucune soirée prévue pour l'instant.</Text>
        </View>
      ) : (
        <>
          {upcoming.map((s) => {
            const registered = !!s.myRegistration;
            const isGuestInput = guestInput?.id === s.id;
            const busy = registering === s.id;
            return (
              <View key={s.id} style={[s2.card, registered && s2.cardRegistered]}>
                {s.imageUrl ? (
                  <Image source={{ uri: s.imageUrl }} style={s2.image} resizeMode="cover" />
                ) : null}
                <View style={s2.body}>
                  <View style={s2.row}>
                    <Text style={s2.name}>{s.name}</Text>
                    {registered && <Text style={s2.badge}>✓ Inscrit(e)</Text>}
                  </View>
                  <Text style={s2.meta}>📅 {formatDate(s.date)}</Text>
                  <Text style={s2.meta}>🕐 {s.startTime}  📍 {s.location}</Text>
                  <Text style={s2.count}>👥 {s.registrationCount} inscrit(s)</Text>
                  {s.myRegistration?.guestName ? (
                    <Text style={s2.guest}>Avec : {s.myRegistration.guestName}</Text>
                  ) : null}
                  {s.info ? <Text style={s2.info}>{s.info}</Text> : null}

                  {busy ? (
                    <ActivityIndicator style={{ marginTop: 12 }} color="#C8102E" />
                  ) : registered ? (
                    <TouchableOpacity style={s2.btnOutline} onPress={() => unregister(s)}>
                      <Text style={s2.btnOutlineText}>Se désinscrire</Text>
                    </TouchableOpacity>
                  ) : isGuestInput ? (
                    <View style={s2.guestBox}>
                      <TextInput
                        style={s2.guestInput}
                        placeholder="Accompagnant(e) ? (optionnel)"
                        value={guestInput.value}
                        onChangeText={(v) => setGuestInput({ id: s.id, value: v })}
                        autoFocus
                      />
                      <View style={s2.guestActions}>
                        <TouchableOpacity style={s2.btnCancel} onPress={() => setGuestInput(null)}>
                          <Text style={s2.btnCancelText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s2.btnPrimary} onPress={() => register(s, guestInput.value)}>
                          <Text style={s2.btnPrimaryText}>Confirmer</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={s2.btnPrimary} onPress={() => setGuestInput({ id: s.id, value: "" })}>
                      <Text style={s2.btnPrimaryText}>S'inscrire</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {past.length > 0 && (
            <>
              <Text style={s2.pastTitle}>Sessions passées</Text>
              {past.map((p) => (
                <View key={p.id} style={s2.pastCard}>
                  <Text style={s2.pastName}>{p.name}</Text>
                  <Text style={s2.pastMeta}>{formatDate(p.date)}  ·  {p.registrationCount} inscrit(s)</Text>
                  {p.myRegistration && <Text style={s2.pastBadge}>✓ Vous étiez inscrit(e)</Text>}
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  empty:     { alignItems: "center", marginTop: 80 },
  emptyEmoji:{ fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#9ca3af", fontSize: 15 },
});

const s2 = StyleSheet.create({
  card:           { backgroundColor: "#fff", borderRadius: 20, margin: 16, marginBottom: 8, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardRegistered: { borderWidth: 2, borderColor: "#86efac" },
  image:          { width: "100%", height: 160 },
  body:           { padding: 16 },
  row:            { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 },
  name:           { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 },
  badge:          { fontSize: 12, backgroundColor: "#dcfce7", color: "#166534", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, fontWeight: "600", marginLeft: 8 },
  meta:           { fontSize: 13, color: "#6b7280", marginBottom: 2 },
  count:          { fontSize: 13, color: "#2563eb", fontWeight: "600", marginTop: 2 },
  guest:          { fontSize: 13, color: "#374151", marginTop: 4 },
  info:           { fontSize: 13, color: "#6b7280", marginTop: 6, lineHeight: 18 },
  btnPrimary:     { backgroundColor: "#C8102E", borderRadius: 12, padding: 12, alignItems: "center", marginTop: 12 },
  btnPrimaryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  btnOutline:     { borderWidth: 1.5, borderColor: "#fca5a5", borderRadius: 12, padding: 12, alignItems: "center", marginTop: 12 },
  btnOutlineText: { color: "#dc2626", fontWeight: "600", fontSize: 14 },
  btnCancel:      { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 10, alignItems: "center" },
  btnCancelText:  { color: "#6b7280", fontWeight: "500", fontSize: 14 },
  guestBox:       { marginTop: 12 },
  guestInput:     { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 8 },
  guestActions:   { flexDirection: "row", gap: 8 },
  pastTitle:      { fontSize: 16, fontWeight: "700", color: "#6b7280", paddingHorizontal: 16, paddingTop: 12, marginBottom: 4 },
  pastCard:       { backgroundColor: "#f3f4f6", borderRadius: 14, marginHorizontal: 16, marginBottom: 8, padding: 14, opacity: 0.8 },
  pastName:       { fontSize: 15, fontWeight: "600", color: "#374151" },
  pastMeta:       { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  pastBadge:      { fontSize: 12, color: "#16a34a", marginTop: 4 },
});
