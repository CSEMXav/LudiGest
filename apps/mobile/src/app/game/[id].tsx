import { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiGet, apiPost } from "@/lib/api";

interface GameDetail {
  id: string;
  name: string;
  type: string;
  summary?: string | null;
  minAge?: number | null;
  coverUrl?: string | null;
  status: "AVAILABLE" | "BORROWED" | "SUSPENDED";
  averageRating?: number | null;
  ratingsCount: number;
  activeLoan?: { dueAt: string; isCurrentUser: boolean } | null;
}

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);

  useEffect(() => {
    apiGet<GameDetail>(`/api/games/${id}`)
      .then(setGame)
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id]);

  async function borrow() {
    setBorrowing(true);
    try {
      const loan: any = await apiPost("/api/loans", { gameId: id });
      Alert.alert("Emprunt enregistré !", `À rendre avant le ${new Date(loan.dueAt).toLocaleDateString("fr-FR")}`);
      const updated = await apiGet<GameDetail>(`/api/games/${id}`);
      setGame(updated);
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setBorrowing(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 80 }} color="#d24a1f" />;
  if (!game) return null;

  const STATUS_LABEL = { AVAILABLE: "Disponible", BORROWED: "Emprunté", SUSPENDED: "Suspendu" };
  const STATUS_COLOR = { AVAILABLE: "#16a34a", BORROWED: "#ea580c", SUSPENDED: "#6b7280" };

  return (
    <ScrollView style={{ backgroundColor: "#f9fafb" }}>
      {game.coverUrl ? (
        <Image source={{ uri: game.coverUrl }} style={s.cover} resizeMode="cover" />
      ) : (
        <View style={[s.cover, s.coverPlaceholder]}><Text style={{ fontSize: 72 }}>🎲</Text></View>
      )}

      <View style={s.body}>
        <View style={s.titleRow}>
          <Text style={s.title} numberOfLines={3}>{game.name}</Text>
          <View style={[s.badge, { backgroundColor: STATUS_COLOR[game.status] + "22" }]}>
            <Text style={[s.badgeText, { color: STATUS_COLOR[game.status] }]}>{STATUS_LABEL[game.status]}</Text>
          </View>
        </View>

        <Text style={s.meta}>Type : {game.type}</Text>
        {game.minAge && <Text style={s.meta}>À partir de {game.minAge} ans</Text>}
        {game.averageRating && (
          <Text style={s.meta}>
            {"★".repeat(Math.round(game.averageRating))}{"☆".repeat(5 - Math.round(game.averageRating))}
            {" "}{game.averageRating}/5 ({game.ratingsCount} avis)
          </Text>
        )}

        {game.activeLoan?.isCurrentUser && (
          <View style={s.myLoanBanner}>
            <Text style={{ color: "#92400e", fontSize: 13 }}>
              Vous avez emprunté ce jeu — à rendre avant le {new Date(game.activeLoan.dueAt).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        )}

        {game.summary && (
          <View style={s.summaryBox}>
            <Text style={s.summaryTitle}>Résumé</Text>
            <Text style={s.summary}>{game.summary}</Text>
          </View>
        )}

        {game.status === "AVAILABLE" && (
          <TouchableOpacity
            style={[s.borrowBtn, borrowing && { opacity: 0.6 }]}
            onPress={borrow}
            disabled={borrowing}
          >
            <Text style={s.borrowBtnText}>{borrowing ? "En cours..." : "Emprunter ce jeu"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  cover: { width: "100%", height: 260 },
  coverPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  body: { padding: 20 },
  titleRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 10 },
  title: { flex: 1, fontSize: 22, fontWeight: "bold", color: "#111827" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  meta: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  myLoanBanner: { backgroundColor: "#fef3c7", borderRadius: 10, padding: 12, marginVertical: 12 },
  summaryBox: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginTop: 16 },
  summaryTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 8 },
  summary: { fontSize: 14, color: "#374151", lineHeight: 22 },
  borrowBtn: { backgroundColor: "#d24a1f", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 20 },
  borrowBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
