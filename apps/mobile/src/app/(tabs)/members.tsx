import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator, RefreshControl,
} from "react-native";
import { apiGet } from "@/lib/api";
import type { MemberDTO } from "@ludigest/types";

export default function MembersScreen() {
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await apiGet<MemberDTO[]>("/api/members");
      setMembers(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); load(true); }, []);

  const filtered = members.filter((m) =>
    m.nickname.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#C8102E" />;

  return (
    <View style={s.container}>
      <TextInput
        style={s.search}
        placeholder="Rechercher un membre…"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8102E" />}
        contentContainerStyle={filtered.length === 0 ? s.emptyContainer : { paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>👥</Text>
            <Text style={s.emptyText}>{search ? "Aucun membre trouvé." : "Aucun membre visible."}</Text>
          </View>
        }
        renderItem={({ item: m, index }) => (
          <View style={[s.row, index > 0 && s.rowBorder]}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{m.nickname.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={s.nickname}>{m.nickname}</Text>
            <Text style={s.loans}>{m.totalLoans} emprunt{m.totalLoans > 1 ? "s" : ""}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f9fafb" },
  search:         { backgroundColor: "#fff", margin: 16, marginBottom: 8, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 12, fontSize: 15 },
  row:            { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowBorder:      { borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  avatar:         { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  avatarText:     { color: "#C8102E", fontSize: 15, fontWeight: "700" },
  nickname:       { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827" },
  loans:          { fontSize: 12, color: "#9ca3af" },
  emptyContainer: { flex: 1 },
  empty:          { alignItems: "center", marginTop: 80 },
  emptyEmoji:     { fontSize: 48, marginBottom: 12 },
  emptyText:      { color: "#9ca3af", fontSize: 15 },
});
