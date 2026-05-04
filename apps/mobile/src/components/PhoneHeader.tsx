import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

interface PhoneHeaderProps {
  title: string;
  subtitle?: string;
  accent?: string;
  action?: React.ReactNode;
}

function HexPattern() {
  const hexes: { r: number; c: number }[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      hexes.push({ r, c });
    }
  }
  return (
    <Svg
      width={120}
      height={80}
      viewBox="0 0 120 80"
      style={{ position: "absolute", right: -10, top: -8, opacity: 0.18 }}
    >
      {hexes.map(({ r, c }) => (
        <Polygon
          key={`${r}-${c}`}
          points="14,1 26,8 26,22 14,29 2,22 2,8"
          fill="none"
          stroke="#fff"
          strokeWidth="1.2"
          translateX={c * 24 + (r % 2) * 12}
          translateY={r * 22}
        />
      ))}
    </Svg>
  );
}

export function PhoneHeader({ title, subtitle, accent = "#d24a1f", action }: PhoneHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.header, { backgroundColor: accent, paddingTop: insets.top + 14 }]}>
      <HexPattern />
      <View style={s.content}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>
        {action ?? (
          <TouchableOpacity onPress={() => router.push("/account")} style={s.monCompteBtn}>
            <Text style={s.monCompteBtnText}>Mon compte</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header:          { paddingHorizontal: 18, paddingBottom: 16, overflow: "hidden", position: "relative" },
  content:         { flexDirection: "row", alignItems: "center" },
  title:           { color: "#fff", fontSize: 22, fontWeight: "700", letterSpacing: -0.5, lineHeight: 24 },
  subtitle:        { color: "rgba(255,255,255,0.9)", fontSize: 11, marginTop: 3 },
  monCompteBtn:    { borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  monCompteBtnText:{ color: "#fff", fontSize: 11, fontWeight: "600" },
});
