import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LOCATIONS } from "@ludigest/types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", matricule: "", password: "", location: "" });
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function register() {
    const { firstName, lastName, email, matricule, password, location } = form;
    if (!firstName || !lastName || !email || !matricule || !password || !location) {
      return Alert.alert("Erreur", "Tous les champs sont requis, y compris la ludothèque.");
    }
    if (password.length < 8) {
      return Alert.alert("Erreur", "Le mot de passe doit contenir au moins 8 caractères.");
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'inscription.");

      Alert.alert(
        "Vérifiez votre email 📧",
        `Un lien de confirmation a été envoyé à ${email}. Cliquez dessus pour activer votre compte.`,
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.emoji}>🎲</Text>
        <Text style={s.title}>Créer un compte</Text>
        <Text style={s.subtitle}>Réservé aux collaborateurs BRED</Text>

        <Text style={s.required}><Text style={s.star}>*</Text> Champs obligatoires</Text>

        <View style={s.row}>
          <TextInput style={[s.input, s.half]} placeholder="Prénom *" value={form.firstName}
            onChangeText={(v) => set("firstName", v)} autoCapitalize="words" />
          <TextInput style={[s.input, s.half]} placeholder="Nom *" value={form.lastName}
            onChangeText={(v) => set("lastName", v)} autoCapitalize="words" />
        </View>
        <TextInput style={s.input} placeholder="Email *" value={form.email}
          onChangeText={(v) => set("email", v)} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <TextInput style={s.input} placeholder="Matricule *" value={form.matricule}
          onChangeText={(v) => set("matricule", v)} autoCapitalize="none" />
        <TextInput style={s.input} placeholder="Mot de passe * (min. 8 caractères)" value={form.password}
          onChangeText={(v) => set("password", v)} secureTextEntry />

        <Text style={s.locationLabel}>Votre ludothèque <Text style={s.star}>*</Text></Text>
        <View style={s.locationRow}>
          {LOCATIONS.map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[s.locationBtn, form.location === loc && s.locationBtnActive]}
              onPress={() => set("location", loc)}
            >
              <Text style={[s.locationBtnText, form.location === loc && s.locationBtnTextActive]}>
                📍 {loc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.locationHint}>Vous pourrez changer de ludothèque directement depuis l'application.</Text>

        <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={register} disabled={loading}>
          <Text style={s.buttonText}>{loading ? "Inscription..." : "Créer mon compte"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={s.linkBtn}>
          <Text style={s.linkText}>Déjà un compte ? Se connecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:           { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: "#f9fafb" },
  emoji:               { fontSize: 56, textAlign: "center", marginBottom: 6 },
  title:               { fontSize: 24, fontWeight: "bold", textAlign: "center", color: "#111" },
  subtitle:            { fontSize: 13, textAlign: "center", color: "#9ca3af", marginBottom: 28 },
  row:                 { flexDirection: "row", gap: 10 },
  half:                { flex: 1 },
  input:               { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, color: "#111827" },
  locationLabel:       { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  locationRow:         { flexDirection: "row", gap: 12, marginBottom: 16 },
  locationBtn:         { flex: 1, borderWidth: 2, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, alignItems: "center" },
  locationBtnActive:   { borderColor: "#C8102E", backgroundColor: "#fff5f5" },
  locationBtnText:     { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  locationBtnTextActive: { color: "#C8102E", fontWeight: "700" },
  locationHint:          { fontSize: 12, color: "#9ca3af", textAlign: "center", marginBottom: 12 },
  required:              { fontSize: 12, color: "#9ca3af", marginBottom: 16 },
  star:                  { color: "#ef4444" },
  button:              { backgroundColor: "#C8102E", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 4 },
  buttonDisabled:      { opacity: 0.6 },
  buttonText:          { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkBtn:             { marginTop: 20, alignItems: "center" },
  linkText:            { color: "#C8102E", fontSize: 14 },
});
