import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, RefreshControl, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost } from "@/lib/api";
import type { LoanDTO } from "@ludigest/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function isDueSoon(dueAt: string) {
  const ms = new Date(dueAt).getTime() - Date.now();
  return ms > 0 && ms <= 7 * 24 * 60 * 60 * 1000;
}

export default function LoansTab() {
  const router = useRouter();
  const [loans, setLoans] = useState<LoanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [returnLoan, setReturnLoan] = useState<LoanDTO | null>(null);

  async function load() {
    try {
      const data = await apiGet<LoanDTO[]>("/api/loans");
      setLoans(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  async function doReturn(loanId: string) {
    try {
      await apiPost(`/api/loans/${loanId}/return`, {});
      Alert.alert("Rendu !", "Merci d'avoir rendu le jeu.");
      load();
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    }
  }

  async function doExtend(loanId: string) {
    try {
      const data: any = await apiPost(`/api/loans/${loanId}/extend`, {});
      Alert.alert("Prolongé !", `Nouvelle date limite : ${formatDate(data.dueAt)}`);
      load();
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#C8102E" />;

  return (
    <>
      <FlatList
        data={loans}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8102E" />}
        ListHeaderComponent={
          <Text style={s.activeCount}>{loans.length}/5 emprunt{loans.length > 1 ? "s" : ""} en cours</Text>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>📭</Text>
            <Text style={s.emptyText}>Aucun emprunt en cours</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)")}>
              <Text style={s.link}>Parcourir les jeux →</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const overdue = new Date(item.dueAt) < new Date();
          const dueSoon = isDueSoon(item.dueAt);
          return (
            <View style={[s.card, overdue ? s.cardOverdue : dueSoon ? s.cardWarn : null]}>
              <TouchableOpacity onPress={() => router.push(`/game/${item.gameId}`)} style={s.cardTop}>
                {item.gameCoverUrl ? (
                  <Image source={{ uri: item.gameCoverUrl }} style={s.cover} />
                ) : (
                  <View style={[s.cover, s.coverPlaceholder]}><Text>🎲</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.gameName}>{item.gameName}</Text>
                  <Text style={[s.dueDate, overdue ? s.overdue : dueSoon ? s.dueSoon : null]}>
                    {overdue ? "⚠ En retard — " : dueSoon ? "⏰ Bientôt — " : "Avant le "}
                    {formatDate(item.dueAt)}
                  </Text>
                  {item.extendedCount > 0 && (
                    <Text style={s.extended}>Prolongé {item.extendedCount}x</Text>
                  )}
                  <Text style={s.borrowedDate}>Emprunté le {formatDate(item.borrowedAt)}</Text>
                </View>
              </TouchableOpacity>
              <View style={s.actions}>
                <TouchableOpacity style={s.btnReturn} onPress={() => setReturnLoan(item)}>
                  <Text style={s.btnReturnText}>Rendre</Text>
                </TouchableOpacity>
                {item.extendedCount < 3 && (
                  <TouchableOpacity style={s.btnExtend} onPress={() => doExtend(item.id)}>
                    <Text style={s.btnExtendText}>Prolonger</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={!!returnLoan} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Rendre &quot;{returnLoan?.gameName}&quot; ?</Text>
            <Text style={s.modalBody}>
              Merci de ranger le jeu correctement dans sa boîte avant de le rendre, et de tenir compte de sa catégorie/couleur pour le ranger dans la section correspondante.
            </Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setReturnLoan(null)}>
                <Text style={s.modalCancelText}>Non, annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalConfirm}
                onPress={() => { if (returnLoan) { doReturn(returnLoan.id); setReturnLoan(null); } }}
              >
                <Text style={s.modalConfirmText}>Oui, rendre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  activeCount: { fontSize: 13, color: "#6b7280", marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardOverdue: { backgroundColor: "#fff5f5", borderWidth: 1, borderColor: "#fecaca" },
  cardWarn: { backgroundColor: "#fefce8", borderWidth: 1, borderColor: "#fde68a" },
  cardTop: { flexDirection: "row", gap: 12, marginBottom: 12 },
  cover: { width: 60, height: 60, borderRadius: 10 },
  coverPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  gameName: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 4 },
  dueDate: { fontSize: 13, color: "#6b7280" },
  overdue: { color: "#dc2626", fontWeight: "600" },
  dueSoon: { color: "#d97706", fontWeight: "600" },
  extended: { fontSize: 11, color: "#3b82f6", marginTop: 2 },
  borrowedDate: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  actions: { flexDirection: "row", gap: 10 },
  btnReturn: { flex: 1, backgroundColor: "#C8102E", padding: 10, borderRadius: 10, alignItems: "center" },
  btnReturnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  btnExtend: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", padding: 10, borderRadius: 10, alignItems: "center" },
  btnExtendText: { color: "#374151", fontWeight: "500", fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { color: "#9ca3af", fontSize: 15 },
  link: { color: "#C8102E", fontSize: 14, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalBox: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 380 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 10 },
  modalBody: { fontSize: 14, color: "#4b5563", lineHeight: 20, marginBottom: 20 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", padding: 12, borderRadius: 12, alignItems: "center" },
  modalCancelText: { color: "#374151", fontWeight: "500" },
  modalConfirm: { flex: 1, backgroundColor: "#C8102E", padding: 12, borderRadius: 12, alignItems: "center" },
  modalConfirmText: { color: "#fff", fontWeight: "600" },
});
