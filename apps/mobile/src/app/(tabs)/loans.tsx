import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert,
  ActivityIndicator, RefreshControl, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost } from "@/lib/api";
import type { LoanDTO } from "@ludigest/types";
import { Pion } from "@/components/Pion";
import { PhoneHeader } from "@/components/PhoneHeader";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function isDueSoon(dueAt: string) {
  const ms = new Date(dueAt).getTime() - Date.now();
  return ms > 0 && ms <= 7 * 24 * 60 * 60 * 1000;
}

function hashColor(name: string): string {
  const COLORS = ["#d24a1f", "#e8a82f", "#286b7a", "#6a8f3c", "#5b4d40", "#c54a7a"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return COLORS[h % COLORS.length];
}

function LoanThumb({ loan, size = 52 }: { loan: LoanDTO; size?: number }) {
  if (loan.gameCoverUrl) {
    return <Image source={{ uri: loan.gameCoverUrl }} style={{ width: size, height: size, borderRadius: 10 }} resizeMode="cover" />;
  }
  const color = hashColor(loan.gameName);
  const pionSize = Math.round(size * 0.55);
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Pion tint={color} kind="meeple" w={pionSize} h={pionSize} />
    </View>
  );
}

export default function LoansTab() {
  const router = useRouter();
  const [active, setActive] = useState<LoanDTO[]>([]);
  const [history, setHistory] = useState<LoanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [returnLoan, setReturnLoan] = useState<LoanDTO | null>(null);

  async function load() {
    try {
      const data = await apiGet<LoanDTO[]>("/api/loans?all=true");
      setActive(data.filter((l) => !l.returnedAt));
      setHistory(data.filter((l) => !!l.returnedAt).sort(
        (a, b) => new Date(b.returnedAt!).getTime() - new Date(a.returnedAt!).getTime()
      ));
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

  if (loading) return <ActivityIndicator style={{ marginTop: 80 }} color="#d24a1f" />;

  return (
    <>
      <View style={{ flex: 1, backgroundColor: "#fef9f0" }}>
        <PhoneHeader title="Mes emprunts" subtitle={`${active.length}/5 emprunt${active.length > 1 ? "s" : ""} actifs`} />

        <FlatList
          data={active}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d24a1f" />}
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
                <TouchableOpacity onPress={() => router.push(`/game/${item.gameId}`)} style={s.cardTop} activeOpacity={0.8}>
                  <LoanThumb loan={item} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.gameName}>{item.gameName}</Text>
                    <Text style={[s.dueDate, overdue ? s.overdue : dueSoon ? s.dueSoon : null]}>
                      {overdue ? "⚠ En retard — " : dueSoon ? "⏰ Bientôt — " : "À rendre · "}
                      {formatDateShort(item.dueAt)}
                    </Text>
                    {item.extendedCount > 0 && (
                      <View style={s.extendedBadge}>
                        <Text style={s.extendedBadgeText}>Prolongé {item.extendedCount}×</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                <View style={s.actions}>
                  <TouchableOpacity style={s.btnReturn} onPress={() => setReturnLoan(item)}>
                    <Text style={s.btnReturnText}>Rendre</Text>
                  </TouchableOpacity>
                  {item.extendedCount < 2 && (
                    <TouchableOpacity style={s.btnExtend} onPress={() => doExtend(item.id)}>
                      <Text style={s.btnExtendText}>Prolonger (+1 semaine)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            history.length > 0 ? (
              <View style={s.historySection}>
                <Text style={s.historySectionTitle}>HISTORIQUE</Text>
                {history.map((item) => (
                  <TouchableOpacity key={item.id} onPress={() => router.push(`/game/${item.gameId}`)} style={s.historyCard} activeOpacity={0.8}>
                    <LoanThumb loan={item} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.gameName}>{item.gameName}</Text>
                      <Text style={s.historyDate}>Rendu le {formatDate(item.returnedAt!)}</Text>
                    </View>
                    <View style={s.rendуBadge}>
                      <Text style={s.renduBadgeText}>Rendu</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />
      </View>

      {/* Modal confirmation retour */}
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
  card:              { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: "#ece1cd" },
  cardOverdue:       { backgroundColor: "#fff5f5", borderColor: "#fecaca" },
  cardWarn:          { backgroundColor: "#fefce8", borderColor: "#fde68a" },
  cardTop:           { flexDirection: "row", gap: 12, marginBottom: 12, alignItems: "center" },
  gameName:          { fontSize: 15, fontWeight: "600", color: "#1e1610", marginBottom: 3 },
  dueDate:           { fontSize: 13, color: "#6b7280" },
  overdue:           { color: "#dc2626", fontWeight: "600" },
  dueSoon:           { color: "#d97706", fontWeight: "600" },
  extendedBadge:     { marginTop: 4, alignSelf: "flex-start", backgroundColor: "#e0f2fe", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  extendedBadgeText: { fontSize: 10, color: "#0369a1", fontWeight: "600" },
  actions:           { flexDirection: "row", gap: 10 },
  btnReturn:         { flex: 1, backgroundColor: "#d24a1f", padding: 10, borderRadius: 10, alignItems: "center" },
  btnReturnText:     { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnExtend:         { flex: 1, borderWidth: 1.5, borderColor: "#ece1cd", padding: 10, borderRadius: 10, alignItems: "center" },
  btnExtendText:     { color: "#1e1610", fontWeight: "500", fontSize: 14 },
  empty:             { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText:         { color: "#9ca3af", fontSize: 15 },
  link:              { color: "#d24a1f", fontSize: 14, marginTop: 8 },
  historySection:    { marginTop: 16 },
  historySectionTitle: { fontSize: 11, fontWeight: "700", color: "#9a8b7c", letterSpacing: 0.8, marginBottom: 10 },
  historyCard:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#ece1cd" },
  historyDate:       { fontSize: 12, color: "#9ca3af" },
  rendуBadge:        { backgroundColor: "#e8f4ec", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  renduBadgeText:    { fontSize: 11, color: "#3a6a3e", fontWeight: "600" },
  modalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalBox:          { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%" },
  modalTitle:        { fontSize: 17, fontWeight: "700", color: "#1e1610", marginBottom: 10 },
  modalBody:         { fontSize: 14, color: "#4b5563", lineHeight: 20, marginBottom: 20 },
  modalBtns:         { flexDirection: "row", gap: 10 },
  modalCancel:       { flex: 1, borderWidth: 1, borderColor: "#d1d5db", padding: 12, borderRadius: 12, alignItems: "center" },
  modalCancelText:   { color: "#374151", fontWeight: "500" },
  modalConfirm:      { flex: 1, backgroundColor: "#d24a1f", padding: 12, borderRadius: 12, alignItems: "center" },
  modalConfirmText:  { color: "#fff", fontWeight: "600" },
});
