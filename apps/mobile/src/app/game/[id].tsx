import { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Modal, TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiGet, apiPost } from "@/lib/api";

const CAT_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  escape:   { label: "Escape",   color: "#d24a1f", emoji: "🎲" },
  famille:  { label: "Famille",  color: "#e8a82f", emoji: "♟" },
  ambiance: { label: "Ambiance", color: "#286b7a", emoji: "🃏" },
  enfant:   { label: "Enfant",   color: "#f4c430", emoji: "🪀" },
  "initié": { label: "Initié",   color: "#5b4d40", emoji: "⚙" },
  expert:   { label: "Expert",   color: "#6a8f3c", emoji: "⭐" },
};

interface Rating {
  id: string;
  userId: string;
  userName: string;
  stars: number;
  comment?: string | null;
  createdAt: string;
}

interface GameDetail {
  id: string;
  name: string;
  type: string;
  category: string;
  summary?: string | null;
  minAge?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  duration?: number | null;
  coverUrl?: string | null;
  status: "AVAILABLE" | "BORROWED" | "SUSPENDED";
  averageRating?: number | null;
  ratingsCount: number;
  ratings: Rating[];
  activeLoan?: { dueAt: string; isCurrentUser: boolean } | null;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [rateStars, setRateStars] = useState(0);
  const [rateComment, setRateComment] = useState("");
  const [rateLoading, setRateLoading] = useState(false);
  const [reportMsg, setReportMsg] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

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

  async function submitRating() {
    if (rateStars === 0) return Alert.alert("Erreur", "Choisissez une note.");
    setRateLoading(true);
    try {
      await apiPost(`/api/games/${id}/ratings`, { stars: rateStars, comment: rateComment || null });
      const updated = await apiGet<GameDetail>(`/api/games/${id}`);
      setGame(updated);
      setShowRateModal(false);
      setRateStars(0);
      setRateComment("");
    } catch (err: any) {
      Alert.alert("Erreur", err.message ?? "Impossible de noter.");
    } finally {
      setRateLoading(false);
    }
  }

  async function submitReport() {
    if (!reportMsg.trim()) return Alert.alert("Erreur", "Décrivez le problème.");
    setReportLoading(true);
    try {
      await apiPost(`/api/games/${id}/report`, { message: reportMsg });
      setShowReportModal(false);
      setReportMsg("");
      Alert.alert("Signalement envoyé", "Merci, les administrateurs ont été notifiés.");
    } catch (err: any) {
      Alert.alert("Erreur", err.message ?? "Impossible d'envoyer le signalement.");
    } finally {
      setReportLoading(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 80 }} color="#d24a1f" />;
  if (!game) return null;

  const cat = CAT_CONFIG[game.category] ?? { label: game.category, color: "#9a8b7c", emoji: "🎲" };
  const isAvailable = game.status === "AVAILABLE";
  const playersLabel = game.minPlayers && game.maxPlayers
    ? `👥 ${game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`} j.`
    : null;

  return (
    <>
      <ScrollView style={{ backgroundColor: "#fef9f0" }}>
        {/* Zone visuelle */}
        <View style={{ position: "relative" }}>
          {game.coverUrl ? (
            <Image source={{ uri: game.coverUrl }} style={s.cover} resizeMode="cover" />
          ) : (
            <View style={[s.cover, { backgroundColor: cat.color, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 96 }}>{cat.emoji}</Text>
            </View>
          )}
          <View style={[s.catBadge, { backgroundColor: cat.color }]}>
            <Text style={s.catBadgeText}>{cat.label}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: isAvailable ? "#e8f4ec" : "rgba(30,22,16,.85)" }]}>
            <Text style={[s.statusBadgeText, { color: isAvailable ? "#3a6a3e" : "#fff" }]}>
              ● {isAvailable ? "Disponible" : "Emprunté"}
            </Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.title}>{game.name}</Text>
          <Text style={s.typeLine}>Type : {game.type}</Text>

          {/* Meta pills */}
          <View style={s.metaRow}>
            {playersLabel && <View style={s.pill}><Text style={s.pillText}>{playersLabel}</Text></View>}
            {game.duration && <View style={s.pill}><Text style={s.pillText}>⏱ {game.duration}min</Text></View>}
            {game.minAge && <View style={s.pill}><Text style={s.pillText}>🎂 {game.minAge}+</Text></View>}
          </View>

          {/* Note */}
          {game.averageRating != null && (
            <Text style={s.ratingLine}>
              {"★".repeat(Math.round(game.averageRating))}{"☆".repeat(5 - Math.round(game.averageRating))}
              {"  "}{game.averageRating}/5 · {game.ratingsCount} avis
            </Text>
          )}

          {/* Bannière emprunt en cours */}
          {game.activeLoan?.isCurrentUser && (
            <View style={s.myLoanBanner}>
              <Text style={{ color: "#92400e", fontSize: 13 }}>
                Vous avez emprunté ce jeu — à rendre avant le {new Date(game.activeLoan.dueAt).toLocaleDateString("fr-FR")}
              </Text>
            </View>
          )}

          {/* Description */}
          {game.summary && <Text style={s.summary}>{game.summary}</Text>}

          {/* Bouton Emprunter */}
          {isAvailable && (
            <TouchableOpacity style={[s.borrowBtn, borrowing && { opacity: 0.6 }]} onPress={borrow} disabled={borrowing}>
              <Text style={s.borrowBtnText}>{borrowing ? "En cours..." : "Emprunter ce jeu"}</Text>
            </TouchableOpacity>
          )}

          {/* Signaler / Noter */}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={() => setShowReportModal(true)}>
              <Text style={s.actionBtnText}>🚨 Signaler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => setShowRateModal(true)}>
              <Text style={s.actionBtnText}>★ Noter</Text>
            </TouchableOpacity>
          </View>

          {/* Avis */}
          {game.ratings.length > 0 && (
            <View style={s.reviewsSection}>
              <Text style={s.reviewsTitle}>AVIS · {game.ratingsCount}</Text>
              {game.ratings.slice(0, 5).map((r) => (
                <View key={r.id} style={s.reviewCard}>
                  <View style={s.reviewHeader}>
                    <View style={s.reviewAvatar}>
                      <Text style={s.reviewAvatarText}>{getInitials(r.userName)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.reviewName}>{r.userName}</Text>
                      <Text style={s.reviewStars}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</Text>
                    </View>
                  </View>
                  {r.comment && <Text style={s.reviewComment}>{r.comment}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal noter */}
      <Modal visible={showRateModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Noter {game.name}</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRateStars(n)}>
                  <Text style={{ fontSize: 36, color: n <= rateStars ? "#e8a82f" : "#d1d5db" }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={s.commentInput}
              placeholder="Commentaire (optionnel)"
              value={rateComment}
              onChangeText={setRateComment}
              multiline
              numberOfLines={3}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowRateModal(false)}>
                <Text style={s.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirm, rateLoading && { opacity: 0.6 }]} onPress={submitRating} disabled={rateLoading}>
                <Text style={s.modalConfirmText}>{rateLoading ? "Envoi..." : "Envoyer"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal signaler */}
      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Signaler un problème</Text>
            <TextInput
              style={[s.commentInput, { marginTop: 12 }]}
              placeholder="Décrivez le problème (pièce manquante, boîte abîmée...)"
              value={reportMsg}
              onChangeText={setReportMsg}
              multiline
              numberOfLines={4}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowReportModal(false)}>
                <Text style={s.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirm, reportLoading && { opacity: 0.6 }]} onPress={submitReport} disabled={reportLoading}>
                <Text style={s.modalConfirmText}>{reportLoading ? "Envoi..." : "Envoyer"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  cover:            { width: "100%", height: 240 },
  catBadge:         { position: "absolute", top: 14, left: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  catBadgeText:     { color: "#fff", fontSize: 12, fontWeight: "700" },
  statusBadge:      { position: "absolute", top: 14, right: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText:  { fontSize: 12, fontWeight: "600" },
  body:             { padding: 20 },
  title:            { fontSize: 26, fontWeight: "700", color: "#1e1610", marginBottom: 4 },
  typeLine:         { fontSize: 14, color: "#9a8b7c", marginBottom: 12 },
  metaRow:          { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  pill:             { backgroundColor: "#f0ebe3", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pillText:         { fontSize: 13, color: "#1e1610", fontWeight: "500" },
  ratingLine:       { fontSize: 15, color: "#e8a82f", fontWeight: "600", marginBottom: 12 },
  myLoanBanner:     { backgroundColor: "#fef3c7", borderRadius: 10, padding: 12, marginBottom: 12 },
  summary:          { fontSize: 14, color: "#4b5563", lineHeight: 22, marginBottom: 20 },
  borrowBtn:        { backgroundColor: "#d24a1f", padding: 16, borderRadius: 14, alignItems: "center", marginBottom: 12 },
  borrowBtnText:    { color: "#fff", fontSize: 16, fontWeight: "700" },
  actionRow:        { flexDirection: "row", gap: 10, marginBottom: 24 },
  actionBtn:        { flex: 1, borderWidth: 1.5, borderColor: "#ece1cd", padding: 12, borderRadius: 12, alignItems: "center" },
  actionBtnText:    { fontSize: 14, fontWeight: "600", color: "#1e1610" },
  reviewsSection:   { marginTop: 4 },
  reviewsTitle:     { fontSize: 11, fontWeight: "700", color: "#9a8b7c", letterSpacing: 0.8, marginBottom: 12 },
  reviewCard:       { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#ece1cd" },
  reviewHeader:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  reviewAvatar:     { width: 32, height: 32, borderRadius: 16, backgroundColor: "#e8a82f", alignItems: "center", justifyContent: "center" },
  reviewAvatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  reviewName:       { fontSize: 13, fontWeight: "600", color: "#1e1610" },
  reviewStars:      { fontSize: 11, color: "#e8a82f" },
  reviewComment:    { fontSize: 13, color: "#4b5563", lineHeight: 18 },
  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox:         { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle:       { fontSize: 17, fontWeight: "700", color: "#1e1610", marginBottom: 16 },
  starsRow:         { flexDirection: "row", gap: 8, marginBottom: 16 },
  commentInput:     { borderWidth: 1.5, borderColor: "#ece1cd", borderRadius: 12, padding: 12, fontSize: 14, color: "#1e1610", textAlignVertical: "top" },
  modalBtns:        { flexDirection: "row", gap: 10, marginTop: 16 },
  modalCancel:      { flex: 1, borderWidth: 1, borderColor: "#d1d5db", padding: 12, borderRadius: 12, alignItems: "center" },
  modalCancelText:  { color: "#374151", fontWeight: "500" },
  modalConfirm:     { flex: 1, backgroundColor: "#d24a1f", padding: 12, borderRadius: 12, alignItems: "center" },
  modalConfirmText: { color: "#fff", fontWeight: "600" },
});
