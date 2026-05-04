import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, ScrollView, RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { apiGet } from "@/lib/api";
import { getStoredUser, getStoredLocation } from "@/lib/auth";
import type { GameDTO, GameCategory } from "@ludigest/types";

const STATUS_LABELS = { AVAILABLE: "Disponible", BORROWED: "Emprunté", SUSPENDED: "Suspendu" };
const STATUS_COLORS = { AVAILABLE: "#16a34a", BORROWED: "#ea580c", SUSPENDED: "#6b7280" };

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
  { key: "recent", label: "Plus récents" },
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

  // Recharge les jeux quand on revient sur cet onglet (ex: après changement de lieu)
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
      {location ? (
        <View style={s.locationBanner}>
          <Text style={s.locationBannerText}>📍 {location}</Text>
        </View>
      ) : null}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher un jeu..."
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {isAdmin && (
          <TouchableOpacity style={s.addBtn} onPress={() => router.push("/admin/add-game")}>
            <Text style={s.addBtnText}>＋</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres catégorie */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[s.chip, category === c.key && s.chipActive]}
            onPress={() => setCategory(c.key as GameCategory | "")}
          >
            <Text style={[s.chipText, category === c.key && s.chipTextActive]} numberOfLines={1}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filtres statut */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
        {(["", "AVAILABLE", "BORROWED"] as const).map((f) => (
          <TouchableOpacity key={f} style={[s.filterBtn, status === f && s.filterActive]} onPress={() => setStatus(f)}>
            <Text style={[s.filterText, status === f && s.filterTextActive]}>
              {f === "" ? "Tous" : STATUS_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
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
          contentContainerStyle={{ padding: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d24a1f" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/game/${item.id}`)} activeOpacity={0.8}>
              {item.coverUrl
                ? <Image source={{ uri: item.coverUrl }} style={s.cover} resizeMode="cover" />
                : <View style={[s.cover, s.coverPlaceholder]}><Text style={{ fontSize: 32 }}>🎲</Text></View>
              }
              <View style={s.cardBody}>
                <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                <Text style={s.cardCategory}>{item.category}</Text>
                <Text style={[s.statusDot, { color: STATUS_COLORS[item.status] }]}>
                  ● {STATUS_LABELS[item.status]}
                </Text>
                {item.averageRating != null && (
                  <Text style={s.rating}>{"★".repeat(Math.round(item.averageRating))} {item.averageRating}/5</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
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
  locationBanner: { backgroundColor: "#fde2d2", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5bba8" },
  locationBannerText: { fontSize: 13, color: "#d24a1f", fontWeight: "600" },
  searchRow: { flexDirection: "row", padding: 12, paddingBottom: 0, gap: 8 },
  searchInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#ece1cd", borderRadius: 12, padding: 12, fontSize: 15 },
  addBtn: { backgroundColor: "#d24a1f", width: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "#fff", fontSize: 22, lineHeight: 28 },
  chipRow: { marginTop: 10, flexGrow: 0, flexShrink: 0 },
  filterRow: { paddingVertical: 8, flexGrow: 0, flexShrink: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: "#ece1cd", backgroundColor: "#fff", flexShrink: 0 },
  chipActive: { backgroundColor: "#d24a1f", borderColor: "#d24a1f" },
  chipText: { fontSize: 12, color: "#1e1610" },
  chipTextActive: { color: "#fff" },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: "#ece1cd", backgroundColor: "#fff", flexShrink: 0 },
  filterActive: { backgroundColor: "#1e1610", borderColor: "#1e1610" },
  sortActive: { backgroundColor: "#e8a82f", borderColor: "#e8a82f" },
  filterText: { fontSize: 12, color: "#1e1610" },
  filterTextActive: { color: "#fff" },
  sortTextActive: { color: "#fff" },
card: { flex: 1, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", borderWidth: 1.5, borderColor: "#ece1cd", elevation: 0 },
  cover: { width: "100%", aspectRatio: 1 },
  coverPlaceholder: { backgroundColor: "#fde2d2", alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: "600", color: "#1e1610", marginBottom: 2 },
  cardCategory: { fontSize: 10, color: "#8a7a6a", marginBottom: 2, textTransform: "capitalize" },
  statusDot: { fontSize: 11, fontWeight: "500" },
  rating: { fontSize: 10, color: "#e8a82f", marginTop: 2 },
});
