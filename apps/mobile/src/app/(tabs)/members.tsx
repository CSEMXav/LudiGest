import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator, RefreshControl,
} from "react-native";
import { apiGet } from "@/lib/api";
import type { MemberDTO } from "@ludigest/types";

const P = {
  bg:      "#fef9f0",
  card:    "#ffffff",
  ink:     "#1e1610",
  ink2:    "#5b4d40",
  ink3:    "#9a8b7c",
  rule:    "#ece1cd",
  primary: "#d24a1f",
};

const AVATAR_TINTS = ["#d24a1f", "#e8a82f", "#6a8f3c", "#286b7a", "#c54a7a", "#3a5a8c"];

function getRank(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
}

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

  const sorted = [...members].sort((a, b) => b.totalLoans - a.totalLoans);
  const filtered = sorted.filter((m) =>
    m.nickname.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color={P.primary} />;

  return (
    <View style={st.container}>
      <View style={st.searchWrap}>
        <TextInput
          style={st.search}
          placeholder="Rechercher un membre…"
          placeholderTextColor={P.ink3}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.primary} />}
        contentContainerStyle={filtered.length === 0 ? st.emptyContainer : { paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={st.empty}>
            <Text style={st.emptyEmoji}>👥</Text>
            <Text style={st.emptyText}>{search ? "Aucun membre trouvé." : "Aucun membre visible."}</Text>
          </View>
        }
        renderItem={({ item: m, index }) => {
          const rank = getRank(index);
          const tint = AVATAR_TINTS[index % AVATAR_TINTS.length];
          return (
            <View style={[st.row, index > 0 && st.rowBorder]}>
              <View style={[st.avatar, { backgroundColor: tint + "22" }]}>
                <Text style={[st.avatarText, { color: tint }]}>{m.nickname.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={st.nickname}>{m.nickname}</Text>
              {rank ? (
                <Text style={st.rank}>{rank}</Text>
              ) : null}
              <View style={st.loansBadge}>
                <Text style={st.loansText}>{m.totalLoans}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container:      { flex: 1, backgroundColor: P.bg },
  searchWrap:     { padding: 16, paddingBottom: 8 },
  search:         { backgroundColor: P.card, borderWidth: 1.5, borderColor: P.rule, borderRadius: 14, padding: 12, fontSize: 15, color: P.ink },
  row:            { flexDirection: "row", alignItems: "center", backgroundColor: P.card, paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  rowBorder:      { borderTopWidth: 1, borderTopColor: P.rule },
  avatar:         { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText:     { fontSize: 16, fontWeight: "700" },
  nickname:       { flex: 1, fontSize: 15, fontWeight: "600", color: P.ink },
  rank:           { fontSize: 18, marginRight: 2 },
  loansBadge:     { backgroundColor: P.bg, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: P.rule },
  loansText:      { fontSize: 12, color: P.ink3, fontWeight: "600" },
  emptyContainer: { flex: 1 },
  empty:          { alignItems: "center", marginTop: 80 },
  emptyEmoji:     { fontSize: 48, marginBottom: 12 },
  emptyText:      { color: P.ink3, fontSize: 15 },
});
