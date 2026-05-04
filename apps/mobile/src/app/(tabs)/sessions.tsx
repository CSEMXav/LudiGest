import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { apiGet, apiFetch } from "@/lib/api";
import { PhoneHeader } from "@/components/PhoneHeader";
import { Pion, type PionKind } from "@/components/Pion";
import type { GameSessionDTO } from "@ludigest/types";

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

const TINTS = ["#d24a1f", "#e8a82f", "#6a8f3c", "#286b7a", "#c54a7a", "#3a5a8c"];
const PION_KINDS: PionKind[] = ["meeple", "hex", "die", "card", "chip", "star"];

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

  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      <PhoneHeader
        title="Sessions"
        subtitle={upcoming.length > 0 ? `${upcoming.length} session${upcoming.length > 1 ? "s" : ""} à venir` : "Aucune session prévue"}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={P.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.primary} />}
        >
          {upcoming.length === 0 && past.length === 0 ? (
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
                const kind = PION_KINDS[idx % PION_KINDS.length];
                return (
                  <View
                    key={session.id}
                    style={[st.card, { borderColor: registered ? P.vert : P.rule, borderWidth: registered ? 2 : 1 }]}
                  >
                    {/* Visual band */}
                    <View style={[st.band, { backgroundColor: tint }]}>
                      <Pion tint={tint} kind={kind} w={70} h={70} />
                      {registered && (
                        <View style={st.registeredBadge}>
                          <Text style={st.registeredBadgeText}>✓ Inscrit·e</Text>
                        </View>
                      )}
                    </View>

                    <View style={st.body}>
                      <Text style={st.name}>{session.name}</Text>
                      <Text style={st.meta}>📅 {formatDate(session.date)}</Text>
                      <Text style={st.meta}>🕐 {session.startTime}  ·  📍 {session.location}</Text>
                      <Text style={[st.count, { color: P.bleu }]}>
                        👥 {session.registrationCount} inscrit·e·s
                      </Text>
                      {session.myRegistration?.guestName ? (
                        <Text style={st.guest}>Avec : {session.myRegistration.guestName}</Text>
                      ) : null}
                      {session.info ? <Text style={st.info}>{session.info}</Text> : null}

                      {busy ? (
                        <ActivityIndicator style={{ marginTop: 12 }} color={P.primary} />
                      ) : registered ? (
                        <TouchableOpacity style={[st.btnOutline, { borderColor: P.primary }]} onPress={() => unregister(session)}>
                          <Text style={[st.btnOutlineText, { color: P.primary }]}>Se désinscrire</Text>
                        </TouchableOpacity>
                      ) : isGuestInput ? (
                        <View style={st.guestBox}>
                          <TextInput
                            style={st.guestInput}
                            placeholder="Accompagnant·e ? (optionnel)"
                            placeholderTextColor={P.ink3}
                            value={guestInput.value}
                            onChangeText={(v) => setGuestInput({ id: session.id, value: v })}
                            autoFocus
                          />
                          <View style={st.guestActions}>
                            <TouchableOpacity style={st.btnCancel} onPress={() => setGuestInput(null)}>
                              <Text style={st.btnCancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[st.btnPrimary, { backgroundColor: tint, flex: 1 }]}
                              onPress={() => register(session, guestInput.value)}
                            >
                              <Text style={st.btnPrimaryText}>Confirmer</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[st.btnPrimary, { backgroundColor: tint }]}
                          onPress={() => setGuestInput({ id: session.id, value: "" })}
                        >
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
                      <Text style={st.pastMeta}>{formatDate(p.date)}  ·  {p.registrationCount} inscrit·e·s</Text>
                      {p.myRegistration && (
                        <Text style={[st.pastBadge, { color: P.vert }]}>✓ Vous étiez inscrit·e</Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  empty:          { alignItems: "center", marginTop: 80 },
  emptyEmoji:     { fontSize: 48, marginBottom: 12 },
  emptyText:      { color: "#9a8b7c", fontSize: 15 },

  card:           { backgroundColor: "#fff", borderRadius: 16, marginBottom: 12, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  band:           { height: 80, alignItems: "center", justifyContent: "center", position: "relative" },
  registeredBadge: { position: "absolute", top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, backgroundColor: "#dcfce7" },
  registeredBadgeText: { fontSize: 10, fontWeight: "700", color: "#166534" },
  body:           { padding: 14 },
  name:           { fontSize: 17, fontWeight: "700", color: "#1e1610", letterSpacing: -0.4, lineHeight: 22, marginBottom: 6 },
  meta:           { fontSize: 12, color: "#5b4d40", marginTop: 2 },
  count:          { fontSize: 12, fontWeight: "700", marginTop: 6 },
  guest:          { fontSize: 11, color: "#9a8b7c", marginTop: 4, fontStyle: "italic" },
  info:           { fontSize: 12, color: "#9a8b7c", marginTop: 6, lineHeight: 18 },

  btnPrimary:     { borderRadius: 12, padding: 12, alignItems: "center", marginTop: 12 },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  btnOutline:     { borderWidth: 1.5, borderRadius: 12, padding: 12, alignItems: "center", marginTop: 12, backgroundColor: "transparent" },
  btnOutlineText: { fontWeight: "700", fontSize: 13 },
  btnCancel:      { flex: 1, borderWidth: 1, borderColor: "#ece1cd", borderRadius: 100, padding: 10, alignItems: "center" },
  btnCancelText:  { color: "#9a8b7c", fontWeight: "500", fontSize: 13 },
  guestBox:       { marginTop: 12 },
  guestInput:     { backgroundColor: "#fef9f0", borderWidth: 1, borderColor: "#ece1cd", borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 8, color: "#1e1610" },
  guestActions:   { flexDirection: "row", gap: 8 },

  pastTitle:      { fontSize: 11, fontWeight: "700", color: "#9a8b7c", textTransform: "uppercase", letterSpacing: 1, marginTop: 8, marginBottom: 8, marginLeft: 4 },
  pastCard:       { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#ece1cd", opacity: 0.85 },
  pastName:       { fontSize: 13, fontWeight: "700", color: "#5b4d40" },
  pastMeta:       { fontSize: 11, color: "#9a8b7c", marginTop: 2 },
  pastBadge:      { fontSize: 11, marginTop: 4, fontWeight: "600" },
});
