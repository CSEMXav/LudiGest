import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { apiPost, ApiError } from "@/lib/api";
import type { GameCategory } from "@ludigest/types";

const CATEGORIES: { key: GameCategory; label: string; color: string }[] = [
  { key: "famille",  label: "Famille",  color: "#f97316" },
  { key: "initié",   label: "Initié",   color: "#6b7280" },
  { key: "expert",   label: "Expert",   color: "#16a34a" },
  { key: "enfant",   label: "Enfant",   color: "#eab308" },
  { key: "ambiance", label: "Ambiance", color: "#3b82f6" },
  { key: "escape",   label: "Escape",   color: "#ef4444" },
];

export default function AddGameScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GameCategory | "">("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string; coverUrl?: string | null; bggFound: boolean } | null>(null);

  async function submit(force = false) {
    if (!name.trim()) return Alert.alert("Erreur", "Le nom du jeu est requis.");
    if (!category) return Alert.alert("Erreur", "Choisissez une catégorie.");

    setLoading(true);
    setResult(null);
    try {
      const data = await apiPost<{ name: string; coverUrl?: string | null; bggFound: boolean }>(
        "/api/admin/games/quick-add",
        { name: name.trim(), category, force }
      );
      setResult(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.canForce) {
        setLoading(false);
        Alert.alert(
          "Jeu déjà existant",
          err.message,
          [
            { text: "Annuler", style: "cancel" },
            { text: "Créer en doublon", onPress: () => submit(true) },
          ]
        );
        return;
      }
      Alert.alert("Erreur", err instanceof Error ? err.message : "Une erreur est survenue.");
    }
    setLoading(false);
  }

  if (result) {
    return (
      <View style={s.container}>
        <View style={s.successCard}>
          <Text style={s.successIcon}>✅</Text>
          <Text style={s.successTitle}>{result.name}</Text>
          <Text style={s.successSub}>
            {result.bggFound
              ? "Infos récupérées automatiquement depuis BoardGameGeek"
              : "Jeu créé — infos BGG non trouvées"}
          </Text>
          <TouchableOpacity style={s.btn} onPress={() => router.back()}>
            <Text style={s.btnText}>Retour à la liste</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnSecondary} onPress={() => { setResult(null); setName(""); setCategory(""); }}>
            <Text style={s.btnSecondaryText}>Ajouter un autre jeu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Ajouter un jeu</Text>
        <Text style={s.subtitle}>Les informations seront récupérées automatiquement sur BoardGameGeek.</Text>

        <Text style={s.label}>Nom du jeu</Text>
        <TextInput
          style={s.input}
          placeholder="Ex: Catan, Ticket to Ride..."
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={s.label}>Catégorie</Text>
        <View style={s.categoryGrid}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[s.categoryBtn, category === c.key && { borderColor: c.color, backgroundColor: c.color + "18" }]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[s.categoryText, category === c.key && { color: c.color, fontWeight: "700" }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color="#C8102E" size="large" />
            <Text style={s.loadingText}>Recherche sur BoardGameGeek...</Text>
          </View>
        ) : (
          <TouchableOpacity style={[s.btn, (!name || !category) && s.btnDisabled]} onPress={submit} disabled={!name || !category}>
            <Text style={s.btnText}>Valider et ajouter</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:       { flexGrow: 1, padding: 20, backgroundColor: "#f9fafb" },
  title:           { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 6 },
  subtitle:        { fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 18 },
  label:           { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input:           { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 20 },
  categoryGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  categoryBtn:     { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  categoryText:    { fontSize: 14, color: "#6b7280" },
  btn:             { backgroundColor: "#C8102E", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  btnDisabled:     { opacity: 0.4 },
  btnText:         { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnSecondary:    { borderWidth: 1.5, borderColor: "#d1d5db", padding: 16, borderRadius: 12, alignItems: "center" },
  btnSecondaryText:{ color: "#374151", fontSize: 15, fontWeight: "500" },
  loadingBox:      { alignItems: "center", padding: 24, gap: 12 },
  loadingText:     { color: "#6b7280", fontSize: 14 },
  successCard:     { backgroundColor: "#fff", borderRadius: 20, padding: 28, alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  successIcon:     { fontSize: 48, marginBottom: 12 },
  successTitle:    { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8, textAlign: "center" },
  successSub:      { fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 24, lineHeight: 18 },
});
