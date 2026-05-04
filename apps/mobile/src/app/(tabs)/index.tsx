import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, ScrollView, RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { apiGet } from "@/lib/api";
import { getStoredUser, getStoredLocation } from "@/lib/auth";
import type { GameDTO, GameCategory } from "@ludigest/types";
import { Pion, CAT_PION } from "@/components/Pion";
import { PhoneHeader } from "@/components/PhoneHeader";

const CAT_CONFIG: Record<string, { label: string; color: string }> = {
  escape:   { label: "Escape",   color: "#d24a1f" },
  famille:  { label: "Famille",  color: "#e8a82f" },
  ambiance: { label: "Ambiance", color: "#286b7a" },
  enfant:   { label: "Enfant",   color: "#f4c430" },
  "initié": { label: "Initié",   color: "#5b4d40" },
  expert:   { label: "Expert",   color: "#6a8f3c" },
};

const CATEGORIES: { key: GameCategory | ""; label: string }[] = [
  { key: "", label: "Tous" },
  { key: "famille", label: "Famille" },
  { key: "initié", label: "Initié" },
  { key: "expert", label: "Expert" },
  { key: "enfant", label: "Enfant" },
  { key: "ambiance", label: "Ambiance" },
  { key: "escape", label: "Escape" },
];

const SORTS: { key: string; label: string }[] = [
  { key: "name_asc", label: "A → Z" },
  { key: "name_desc", label: "Z → A" },
  { key: "rating", label: "Mieux notés" },
  { key: "duration", label: "Durée ↑" },
  { key: "recent", label: "Récents" },
];

function sortGames(games: GameDTO[], sort: string): GameDTO[] {
  return [...games].sort((a, b) => {
    switch (sort) {
      case "name_desc": return b.name.localeCompare(a.name, "fr");
      case "rating":    return (b.averageRating ?? 0) - (a.averageRating ?? 0);
      case "duration":  return (a.duration ?? 999) - (b.duration ?? 999);
      case "recent":    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      default:          return a.name.localeCompare(b.name, "fr");
    }
  });
}

function GameThumb({ game }: { game: GameDTO }) {
  const cat = CAT_CONFIG[game.category] ?? { color: "#9a8b7c" };
  if (game.coverUrl) {
    return <Image source={{ uri: game.coverUrl }} style={s.thumbImg} resizeMode="cover" />;
  }
  return (
    <View style={[s.thumbPlaceholder, { backgroundColor: cat.color }]}>
      <Pion tint={cat.color} kind={CAT_PION[game.category] ?? "meeple"} w={56} h={56} />
    </View>
  );
}

export default function GamesTab() {
  const router = useRouter();
  const [games, setGames] = useState<GameDTO[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "AVAILABLE" | "BORROWED">("");
  const [category, setCategory] = useState<GameCategory | "">("");
  const [sort, setSort] = useState("name_asc");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [location, setLocation] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getStoredUser().then((u) => { if (u?.role === "ADMIN") setIsAdmin(true); });
    getStoredLocation().then(setLocation);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(search, status, category);
    }, [search, status, category])
  );

  async function load(q: string, s: string, cat: string, isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const loc = await getStoredLocation();
    setLocation(loc);
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (s) params.set("status", s);
    if (cat) params.set("category", cat);
    params.set("location", loc);
    try {
      const data = await apiGet<GameDTO[]>(`/api/games?${params}`);
      setGames(data);
    } catch {
      setGames([]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => load(search, status, category), 350);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search, status, category]);

  const onRefresh = useCallback(() => load(search, status, category, true), [search, status, category]);
  const sorted = sortGames(games, sort);

  return (
    <View style={{ flex: 1, backgroundColor: "#fef9f0" }}>
      <PhoneHeader title="Liste des jeux" subtitle={`📍 ${location || "…"} · ${games.length} jeux`} />

      {/* Recherche */}
      <View style={s.searchRow}>
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher un jeu..."
            placeholderTextColor="#9a8b7c"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
        {isAdmin && (
          <TouchableOpacity style={s.addBtn} onPress={() => router.push("/admin/add-game")}>
            <Text style={s.addBtnText}>＋</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chips catégorie */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[s.chip, category === c.key && s.chipActive]}
            onPress={() => setCategory(c.key as GameCategory | "")}
          >
            <Text style={[s.chipText, category === c.key && s.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filtre statut */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
        {(["", "AVAILABLE", "BORROWED"] as const).map((f) => (
          <TouchableOpacity key={f} style={[s.filterBtn, status === f && s.filterActive]} onPress={() => setStatus(f)}>
            <Text style={[s.filterText, status === f && s.filterTextActive]}>
              {f === "" ? "Tous" : f === "AVAILABLE" ? "Disponibles" : "Empruntés"}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
        {SORTS.map((so) => (
          <TouchableOpacity key={so.key} style={[s.filterBtn, sort === so.key && s.sortActive]} onPress={() => setSort(so.key)}>
            <Text style={[s.filterText, sort === so.key && s.sortTextActive]}>{so.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#d24a1f" />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(g) => g.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d24a1f" />}
          renderItem={({ item }) => {
            const cat = CAT_CONFIG[item.category] ?? { label: item.category, color: "#9a8b7c", emoji: "🎲" };
            const isAvailable = item.status === "AVAILABLE";
            return (
              <TouchableOpacity style={s.card} onPress={() => router.push(`/game/${item.id}`)} activeOpacity={0.85}>
                <View style={s.cardVisual}>
                  <GameThumb game={item} />
                  <View style={[s.catBadge, { backgroundColor: cat.color }]}>
                    <Text style={s.catBadgeText}>{cat.label}</Text>
                  </View>
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                  <Text style={[s.statusText, { color: isAvailable ? "#16a34a" : "#ea580c" }]}>
                    ● {isAvailable ? "Disponible" : "Emprunté"}
                  </Text>
                  {item.averageRating != null && (
                    <Text style={s.rating}>{"★".repeat(Math.round(item.averageRating))} {item.averageRating}/5</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ fontSize: 48 }}>🎲</Text>
              <Text style={{ color: "#9ca3af", marginTop: 8 }}>Aucun jeu trouvé</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  searchRow:        { flexDirection: "row", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 8 },
  searchWrap:       { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#ece1cd", borderRadius: 12, paddingHorizontal: 10, height: 44 },
  searchIcon:       { fontSize: 14, marginRight: 6 },
  searchInput:      { flex: 1, fontSize: 14, color: "#1e1610" },
  addBtn:           { backgroundColor: "#d24a1f", width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addBtnText:       { color: "#fff", fontSize: 22, lineHeight: 28 },
  chipRow:          { flexGrow: 0, flexShrink: 0, paddingVertical: 8 },
  filterRow:        { flexGrow: 0, flexShrink: 0, paddingVertical: 4 },
  chip:             { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "#ece1cd", backgroundColor: "#fff" },
  chipActive:       { backgroundColor: "#1e1610", borderColor: "#1e1610" },
  chipText:         { fontSize: 12, fontWeight: "500", color: "#1e1610" },
  chipTextActive:   { color: "#fff", fontWeight: "600" },
  filterBtn:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "#ece1cd", backgroundColor: "#fff" },
  filterActive:     { backgroundColor: "#1e1610", borderColor: "#1e1610" },
  sortActive:       { backgroundColor: "#e8a82f", borderColor: "#e8a82f" },
  filterText:       { fontSize: 12, fontWeight: "500", color: "#1e1610" },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  sortTextActive:   { color: "#fff", fontWeight: "600" },
  card:             { flex: 1, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", borderWidth: 1.5, borderColor: "#ece1cd" },
  cardVisual:       { position: "relative" },
  thumbImg:         { width: "100%", aspectRatio: 1 },
  thumbPlaceholder: { width: "100%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  catBadge:         { position: "absolute", top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  catBadgeText:     { color: "#fff", fontSize: 10, fontWeight: "700" },
  cardBody:         { padding: 10 },
  cardName:         { fontSize: 13, fontWeight: "600", color: "#1e1610", marginBottom: 3 },
  statusText:       { fontSize: 11, fontWeight: "500", marginBottom: 2 },
  rating:           { fontSize: 10, color: "#e8a82f" },
});
