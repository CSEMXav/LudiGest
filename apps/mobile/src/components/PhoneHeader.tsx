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
    for (let c = 0; c < 4; c++) {
      hexes.push({ r, c });
    }
  }
  return (
    <View style={{ position: "absolute", right: -10, top: -8, opacity: 0.2 }} pointerEvents="none">
      <Svg width={140} height={90} viewBox="0 0 140 90">
        {hexes.map(({ r, c }) => (
          <Polygon
            key={`${r}-${c}`}
            points="16,1 30,9 30,25 16,33 2,25 2,9"
            fill="none"
            stroke="#fff"
            strokeWidth="1.4"
            translateX={c * 28 + (r % 2) * 14}
            translateY={r * 26}
          />
        ))}
      </Svg>
    </View>
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
