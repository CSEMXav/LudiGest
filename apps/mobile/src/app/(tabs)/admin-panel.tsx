import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { useRouter } from "expo-router";

const WEB_ADMIN = "https://www.ludigest.fr/admin";

const LINKS = [
  { label: "➕  Ajouter un jeu",         action: "local" as const,  route: "/admin/add-game" },
  { label: "🎲  Gérer les jeux",          action: "web"   as const,  url: `${WEB_ADMIN}/games` },
  { label: "📚  Gérer les emprunts",      action: "web"   as const,  url: `${WEB_ADMIN}/loans` },
  { label: "👥  Gérer les utilisateurs",  action: "web"   as const,  url: `${WEB_ADMIN}/users` },
  { label: "🎉  Soirées ludiques",        action: "web"   as const,  url: `${WEB_ADMIN}/sessions` },
  { label: "📧  Paramètres email",        action: "web"   as const,  url: `${WEB_ADMIN}/email-settings` },
];

export default function AdminPanel() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Text style={s.title}>Panneau d&apos;administration</Text>
      <Text style={s.subtitle}>Les actions web s&apos;ouvrent dans le navigateur.</Text>

      {LINKS.map((item) => (
        <TouchableOpacity
          key={item.label}
          style={s.row}
          onPress={() =>
            item.action === "local"
              ? router.push(item.route as any)
              : Linking.openURL(item.url!)
          }
        >
          <Text style={s.rowText}>{item.label}</Text>
          <Text style={s.arrow}>{item.action === "local" ? "›" : "↗"}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 20 },
  title:     { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle:  { fontSize: 13, color: "#9ca3af", marginBottom: 24 },
  row:       { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  rowText:   { flex: 1, fontSize: 15, color: "#111827", fontWeight: "500" },
  arrow:     { fontSize: 18, color: "#9ca3af" },
});
