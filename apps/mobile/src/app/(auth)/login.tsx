import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { saveAuth } from "@/lib/auth";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email || !password) return Alert.alert("Erreur", "Tous les champs sont requis.");
    if (!email.toLowerCase().endsWith("@bred.fr")) return Alert.alert("Erreur", "Seuls les emails @bred.fr sont autorisés.");

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/mobile-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Identifiants invalides.");

      await saveAuth(data.token, data.user);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erreur de connexion", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.emoji}>🎲</Text>
        <Text style={s.title}>LudiGest</Text>
        <Text style={s.subtitle}>Ludothèque BRED</Text>

        <TextInput
          style={s.input}
          placeholder="prenom.nom@bred.fr"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={s.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={login} disabled={loading}>
          <Text style={s.buttonText}>{loading ? "Connexion..." : "Se connecter"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/register")} style={s.linkBtn}>
          <Text style={s.linkText}>Pas encore de compte ? S&apos;inscrire</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:      { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: "#f9fafb" },
  linkBtn:        { marginTop: 20, alignItems: "center" as const },
  linkText:       { color: "#C8102E", fontSize: 14 },
  emoji: { fontSize: 64, textAlign: "center", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", color: "#111" },
  subtitle: { fontSize: 14, textAlign: "center", color: "#9ca3af", marginBottom: 32 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12 },
  button: { backgroundColor: "#C8102E", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
