import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator, RefreshControl,
  TouchableOpacity, Image, Alert, Linking, KeyboardAvoidingView, Platform,
} from "react-native";
import { apiGet, apiPost, apiFetch } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { PhoneHeader } from "@/components/PhoneHeader";

const P = {
  bg:          "#fef9f0",
  card:        "#ffffff",
  ink:         "#1e1610",
  ink2:        "#5b4d40",
  ink3:        "#9a8b7c",
  rule:        "#ece1cd",
  primary:     "#d24a1f",
  primarySoft: "#fde2d2",
  vert:        "#3f8a3a",
  rouge:       "#c8102e",
};

const CATEGORIES: { value: string; label: string; color: string }[] = [
  { value: "escape",   label: "Escape",   color: "#ef4444" },
  { value: "famille",  label: "Famille",  color: "#fb923c" },
  { value: "ambiance", label: "Ambiance", color: "#3b82f6" },
  { value: "enfant",   label: "Enfant",   color: "#facc15" },
  { value: "initié",   label: "Initié",   color: "#6b7280" },
  { value: "expert",   label: "Expert",   color: "#22c55e" },
];
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

interface Proposal {
  id: string;
  title: string;
  category: string;
  link: string | null;
  summary: string | null;
  coverUrl: string | null;
  minAge: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  duration: number | null;
  proposedBy: string;
  createdAt: string;
  upVotes: number;
  downVotes: number;
  myVote: number;
  canDelete: boolean;
}

interface WindowDTO {
  closesAt: string | null;
  isOpen: boolean;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

function playersLabel(p: Proposal): string | null {
  if (!p.minPlayers) return null;
  if (!p.maxPlayers) return `${p.minPlayers}+ j.`;
  return p.minPlayers === p.maxPlayers ? `${p.minPlayers} j.` : `${p.minPlayers}–${p.maxPlayers} j.`;
}

export default function ProposalsScreen() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [access, setAccess] = useState<"loading" | "open" | "closed">("loading");
  const [closesAt, setClosesAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState<Record<string, boolean>>({});

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [win, user] = await Promise.all([apiGet<WindowDTO>("/api/proposals/settings"), getStoredUser()]);
      // Les admins y ont toujours accès ; les membres uniquement pendant la période d'ouverture
      if (!win.isOpen && user?.role !== "ADMIN") {
        setAccess("closed");
      } else {
        const data = await apiGet<Proposal[]>("/api/proposals");
        setProposals(Array.isArray(data) ? data : []);
        setClosesAt(win.isOpen ? win.closesAt : null);
        setAccess("open");
      }
    } catch {
      setAccess((a) => (a === "loading" ? "closed" : a));
    }
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  async function submit() {
    if (!title.trim() || !category || submitting) return;
    setSubmitting(true);
    try {
      const created = await apiPost<Proposal>("/api/proposals", { title: title.trim(), category, link: link.trim() || undefined });
      setProposals((list) => [created, ...list]);
      setTitle(""); setCategory(""); setLink(""); setFormOpen(false);
    } catch (e) {
      Alert.alert("Proposition", e instanceof Error ? e.message : "Erreur lors de l'ajout.");
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(p: Proposal, value: 1 | -1) {
    setVoting((v) => ({ ...v, [p.id]: true }));
    try {
      const updated = await apiPost<Proposal>(`/api/proposals/${p.id}/vote`, { value: p.myVote === value ? 0 : value });
      setProposals((list) => list.map((x) => (x.id === p.id ? updated : x)));
    } catch (e) {
      Alert.alert("Vote", e instanceof Error ? e.message : "Erreur lors du vote.");
    } finally {
      setVoting((v) => ({ ...v, [p.id]: false }));
    }
  }

  function remove(p: Proposal) {
    Alert.alert("Supprimer", `Supprimer la proposition « ${p.title} » ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          const res = await apiFetch(`/api/proposals/${p.id}`, { method: "DELETE" });
          if (res.ok) setProposals((list) => list.filter((x) => x.id !== p.id));
          else Alert.alert("Erreur", "La suppression a échoué.");
        },
      },
    ]);
  }

  const sorted = [...proposals].sort((a, b) => (b.upVotes - b.downVotes) - (a.upVotes - a.downVotes) || b.upVotes - a.upVotes);

  const voteButton = (p: Proposal, value: 1 | -1) => {
    const on = p.myVote === value;
    const up = value === 1;
    const color = up ? P.vert : P.rouge;
    return (
      <TouchableOpacity
        onPress={() => vote(p, value)}
        disabled={voting[p.id]}
        accessibilityLabel={up ? "J'aimerais ce jeu" : "Pas intéressé"}
        accessibilityState={{ selected: on }}
        style={[st.voteBtn, on && { backgroundColor: color, borderColor: color }, voting[p.id] && { opacity: 0.5 }]}
      >
        <Text style={st.voteIcon}>{up ? "👍" : "👎"}</Text>
        <Text style={[st.voteCount, on && { color: "#fff" }]}>{up ? p.upVotes : p.downVotes}</Text>
      </TouchableOpacity>
    );
  };

  const form = (
    <View style={st.formCard}>
      {closesAt ? <Text style={st.banner}>⏳ Ouvert jusqu&apos;au {formatDateTime(closesAt)}</Text> : null}
      {!formOpen ? (
        <TouchableOpacity style={st.primaryBtn} onPress={() => setFormOpen(true)}>
          <Text style={st.primaryBtnText}>+ Proposer un jeu</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ gap: 10 }}>
          <TextInput
            style={st.input}
            placeholder="Titre du jeu"
            placeholderTextColor={P.ink3}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <TextInput
            style={st.input}
            placeholder="Lien (optionnel) — page d'achat ou de présentation"
            placeholderTextColor={P.ink3}
            value={link}
            onChangeText={setLink}
            maxLength={500}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <View style={st.chips}>
            {CATEGORIES.map((c) => {
              const on = category === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  style={[st.chip, on && { backgroundColor: c.color, borderColor: c.color }]}
                >
                  <Text style={[st.chipText, on && { color: "#fff" }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={[st.secondaryBtn, { flex: 1 }]} onPress={() => setFormOpen(false)} disabled={submitting}>
              <Text style={st.secondaryBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.primaryBtn, { flex: 2 }, (!title.trim() || !category || submitting) && { opacity: 0.5 }]}
              onPress={submit}
              disabled={!title.trim() || !category || submitting}
            >
              <Text style={st.primaryBtnText}>{submitting ? "Recherche des infos…" : "Valider"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: P.bg }}>
      <PhoneHeader
        title="Futurs achats"
        subtitle={access === "open" ? `${proposals.length} proposition${proposals.length > 1 ? "s" : ""}` : "Proposez et votez"}
      />

      {access === "loading" ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={P.primary} />
      ) : access === "closed" ? (
        <View style={st.empty}>
          <Text style={st.emptyEmoji}>🛒</Text>
          <Text style={st.emptyText}>Les propositions d&apos;achat ne sont pas ouvertes pour le moment.</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.primary} />}
          contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
          ListHeaderComponent={form}
          ListEmptyComponent={
            <View style={[st.empty, { marginTop: 40 }]}>
              <Text style={st.emptyEmoji}>🎲</Text>
              <Text style={st.emptyText}>Aucune proposition pour l&apos;instant. Soyez le premier à suggérer un jeu !</Text>
            </View>
          }
          renderItem={({ item: p }) => {
            const specs = [
              playersLabel(p) ? `👥 ${playersLabel(p)}` : null,
              p.duration ? `⏱ ${p.duration} min` : null,
              p.minAge ? `🎂 ${p.minAge}+` : null,
            ].filter(Boolean) as string[];
            const cat = CAT[p.category];
            return (
              <View style={st.row}>
                <View style={st.votes}>
                  {voteButton(p, 1)}
                  {voteButton(p, -1)}
                </View>

                <View style={st.cover}>
                  {p.coverUrl ? (
                    <Image source={{ uri: p.coverUrl }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
                  ) : (
                    <Text style={{ fontSize: 26 }}>🎲</Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={st.title} numberOfLines={2}>{p.title}</Text>
                  <View style={st.specs}>
                    <View style={[st.catPill, { backgroundColor: cat?.color ?? P.ink3 }]}>
                      <Text style={st.catPillText}>{cat?.label ?? p.category}</Text>
                    </View>
                    {specs.map((s) => (
                      <View key={s} style={st.specPill}><Text style={st.specText}>{s}</Text></View>
                    ))}
                  </View>
                  {p.summary ? <Text style={st.summary} numberOfLines={2}>{p.summary}</Text> : null}
                  <View style={st.actions}>
                    <Text style={st.meta} numberOfLines={1}>Par {p.proposedBy}</Text>
                    {p.link ? (
                      <TouchableOpacity onPress={() => Linking.openURL(p.link!).catch(() => {})}>
                        <Text style={st.linkText}>🔗 Voir</Text>
                      </TouchableOpacity>
                    ) : null}
                    {p.canDelete ? (
                      <TouchableOpacity onPress={() => remove(p)}>
                        <Text style={st.deleteText}>Supprimer</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  formCard:        { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#ece1cd", padding: 12, marginBottom: 12, gap: 10 },
  banner:          { fontSize: 12, fontWeight: "600", color: "#d24a1f", backgroundColor: "#fde2d2", borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, overflow: "hidden" },
  input:           { height: 42, paddingHorizontal: 12, borderWidth: 1.5, borderColor: "#ece1cd", backgroundColor: "#fff", borderRadius: 12, fontSize: 14, color: "#1e1610" },
  chips:           { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip:            { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1.5, borderColor: "#ece1cd", backgroundColor: "#fff" },
  chipText:        { fontSize: 12, fontWeight: "700", color: "#5b4d40" },
  primaryBtn:      { backgroundColor: "#d24a1f", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  primaryBtnText:  { color: "#fff", fontSize: 14, fontWeight: "700" },
  secondaryBtn:    { borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1.5, borderColor: "#ece1cd", backgroundColor: "#fff" },
  secondaryBtnText:{ color: "#5b4d40", fontSize: 14, fontWeight: "700" },

  row:             { flexDirection: "row", gap: 10, padding: 10, backgroundColor: "#fff", borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "#ece1cd" },
  votes:           { justifyContent: "center", gap: 6 },
  voteBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 54, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 100, borderWidth: 1.5, borderColor: "#ece1cd", backgroundColor: "#fff" },
  voteIcon:        { fontSize: 14 },
  voteCount:       { fontSize: 13, fontWeight: "700", color: "#1e1610", fontVariant: ["tabular-nums"] },
  cover:           { width: 64, height: 64, borderRadius: 10, backgroundColor: "#fef9f0", alignItems: "center", justifyContent: "center", overflow: "hidden", alignSelf: "center" },
  title:           { fontSize: 14, fontWeight: "700", color: "#1e1610" },
  specs:           { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 5 },
  catPill:         { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 100 },
  catPillText:     { fontSize: 10, fontWeight: "700", color: "#fff" },
  specPill:        { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 100, backgroundColor: "#f4efe6" },
  specText:        { fontSize: 10, fontWeight: "600", color: "#5b4d40" },
  summary:         { fontSize: 11, color: "#5b4d40", marginTop: 5, lineHeight: 15 },
  actions:         { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  meta:            { flex: 1, fontSize: 10, color: "#9a8b7c" },
  linkText:        { fontSize: 11, fontWeight: "700", color: "#286b7a" },
  deleteText:      { fontSize: 11, fontWeight: "700", color: "#c8102e" },

  empty:           { alignItems: "center", marginTop: 80, paddingHorizontal: 32 },
  emptyEmoji:      { fontSize: 48, marginBottom: 12 },
  emptyText:       { color: "#9a8b7c", fontSize: 15, textAlign: "center" },
});
