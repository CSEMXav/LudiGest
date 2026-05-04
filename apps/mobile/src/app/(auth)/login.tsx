import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { saveAuth } from "@/lib/auth";
import { registerPushToken } from "@/lib/push";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  async function login() {
    if (!email || !password) return Alert.alert("Erreur", "Tous les champs sont requis.");
    setUnverified(false);
    setResendDone(false);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/mobile-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.toLowerCase().includes("confirmer votre email")) {
          setUnverified(true);
        } else {
          Alert.alert("Erreur de connexion", data.error ?? "Identifiants invalides.");
        }
        return;
      }
      await saveAuth(data.token, data.user);
      registerPushToken(); // fire-and-forget, non-blocking
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Erreur de connexion", "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    await fetch(`${BASE_URL}/api/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResendDone(true);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.emoji}>🎲</Text>
        <Text style={s.title}>LudiGest</Text>
        <Text style={s.subtitle}>Ludothèque BRED</Text>
        <Text style={s.version}>v0.54</Text>

        <TextInput
          style={s.input}
          placeholder="prenom.nom@exemple.fr"
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

        {unverified && (
          <View style={s.warningBox}>
            <Text style={s.warningText}>Votre email n'est pas encore confirmé.</Text>
            {resendDone ? (
              <Text style={s.successText}>✓ Email de confirmation renvoyé.</Text>
            ) : (
              <TouchableOpacity onPress={resendVerification}>
                <Text style={s.resendLink}>Renvoyer l'email de confirmation</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={login} disabled={loading}>
          <Text style={s.buttonText}>{loading ? "Connexion..." : "Se connecter"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL(`${BASE_URL}/forgot-password`)}
          style={s.forgotBtn}
        >
          <Text style={s.forgotText}>J'ai oublié mon mot de passe</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/register")} style={s.linkBtn}>
          <Text style={s.linkText}>Pas encore de compte ? S'inscrire</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:      { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: "#f9fafb" },
  forgotBtn:      { marginTop: 12, alignItems: "center" as const },
  forgotText:     { color: "#6b7280", fontSize: 13, textDecorationLine: "underline" as const },
  linkBtn:        { marginTop: 16, alignItems: "center" as const },
  linkText:       { color: "#C8102E", fontSize: 14 },
  emoji:          { fontSize: 64, textAlign: "center", marginBottom: 8 },
  title:          { fontSize: 28, fontWeight: "bold", textAlign: "center", color: "#111" },
  subtitle:       { fontSize: 14, textAlign: "center", color: "#9ca3af", marginBottom: 4 },
  version:        { fontSize: 11, textAlign: "center", color: "#d1d5db", marginBottom: 28 },
  input:          { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12, color: "#111827" },
  button:         { backgroundColor: "#C8102E", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: "#fff", fontSize: 16, fontWeight: "600" },
  warningBox:     { backgroundColor: "#fef9c3", borderWidth: 1, borderColor: "#fde047", borderRadius: 12, padding: 14, marginBottom: 12 },
  warningText:    { color: "#854d0e", fontSize: 14, marginBottom: 6 },
  resendLink:     { color: "#C8102E", fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
  successText:    { color: "#166534", fontSize: 14, fontWeight: "600" },
});
