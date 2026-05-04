import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator, RefreshControl,
  TouchableOpacity,
} from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { apiGet } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { PhoneHeader } from "@/components/PhoneHeader";
import type { MemberDTO } from "@ludigest/types";

const P = {
  bg:          "#fef9f0",
  card:        "#ffffff",
  ink:         "#1e1610",
  ink2:        "#5b4d40",
  ink3:        "#9a8b7c",
  rule:        "#ece1cd",
  primary:     "#d24a1f",
  primarySoft: "#fde2d2",
  ocre:        "#e8a82f",
};

const TINTS = ["#d24a1f", "#e8a82f", "#6a8f3c", "#286b7a", "#c54a7a", "#3a5a8c"];

function SearchIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" style={{ position: "absolute", left: 12, top: 12 }}>
      <Circle cx="6" cy="6" r="4.5" fill="none" stroke={P.ink3} strokeWidth="1.6" />
      <Line x1="9.5" y1="9.5" x2="13" y2="13" stroke={P.ink3} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

export default function MembersScreen() {
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [myId, setMyId] = useState<string | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [data, user] = await Promise.all([
        apiGet<MemberDTO[]>("/api/members"),
        getStoredUser(),
      ]);
      setMembers(Array.isArray(data) ? data : []);
      setMyId(user?.id ?? null);
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

  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      <PhoneHeader
        title="Membres"
        subtitle={`${members.length} membres actifs`}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={P.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.primary} />}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { padding: 14, paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={st.searchWrap}>
              <SearchIcon />
              <TextInput
                style={st.search}
                placeholder="Rechercher un membre…"
                placeholderTextColor={P.ink3}
                value={search}
                onChangeText={setSearch}
                clearButtonMode="while-editing"
              />
            </View>
          }
          ListEmptyComponent={
            <View style={st.empty}>
              <Text style={st.emptyEmoji}>👥</Text>
              <Text style={st.emptyText}>{search ? "Aucun membre trouvé." : "Aucun membre visible."}</Text>
            </View>
          }
          renderItem={({ item: m, index }) => {
            const isMe = m.id === myId;
            const tint = TINTS[index % TINTS.length];
            const rankIndex = sorted.indexOf(m);
            const isTop3 = rankIndex < 3 && !isMe;
            return (
              <View style={[
                st.row,
                isMe && { backgroundColor: P.primarySoft, borderColor: P.primary, borderWidth: 1.5 },
              ]}>
                {/* Full-color circle avatar */}
                <View style={[st.avatar, { backgroundColor: isMe ? P.primary : tint }]}>
                  <Text style={st.avatarText}>{m.nickname.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[st.nickname, isMe && { color: P.primary }]}>{m.nickname}</Text>
                    {isMe && (
                      <View style={st.youPill}>
                        <Text style={st.youPillText}>· vous</Text>
                      </View>
                    )}
                  </View>
                  {isTop3 && (
                    <Text style={st.topLabel}>🏆 Top {rankIndex + 1}</Text>
                  )}
                </View>

                <View style={st.loansWrap}>
                  <Text style={st.loansNum}>{m.totalLoans}</Text>
                  <Text style={st.loansLabel}> emprunt{m.totalLoans > 1 ? "s" : ""}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  searchWrap:  { position: "relative", marginBottom: 10 },
  search:      { height: 38, paddingLeft: 36, paddingRight: 14, borderWidth: 1.5, borderColor: "#ece1cd", backgroundColor: "#fff", borderRadius: 12, fontSize: 13, color: "#1e1610" },

  row:         { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: "#fff", borderRadius: 14, marginBottom: 6, borderWidth: 1, borderColor: "#ece1cd" },
  avatar:      { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText:  { fontSize: 16, fontWeight: "700", color: "#fff" },
  nickname:    { fontSize: 14, fontWeight: "700", color: "#1e1610" },
  youPill:     { marginLeft: 6 },
  youPillText: { fontSize: 10, fontWeight: "700", color: "#d24a1f" },
  topLabel:    { fontSize: 10, fontWeight: "700", color: "#e8a82f", marginTop: 1 },
  loansWrap:   { flexDirection: "row", alignItems: "baseline" },
  loansNum:    { fontSize: 16, fontWeight: "700", color: "#1e1610", fontVariant: ["tabular-nums"] },
  loansLabel:  { fontSize: 11, color: "#9a8b7c", fontWeight: "600" },

  empty:       { alignItems: "center", marginTop: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 12 },
  emptyText:   { color: "#9a8b7c", fontSize: 15 },
});
