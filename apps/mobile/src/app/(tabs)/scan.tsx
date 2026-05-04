import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  Animated, Easing,
} from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiPost } from "@/lib/api";
import type { LoanDTO } from "@ludigest/types";

const P = {
  bg:      "#fef9f0",
  ink:     "#1e1610",
  ink2:    "#5b4d40",
  ink3:    "#9a8b7c",
  primary: "#d24a1f",
  ocre:    "#e8a82f",
};

export default function ScanTab() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scanLineY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 140] });

  async function handleBarcode({ data }: BarcodeScanningResult) {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    try {
      const loan = await apiPost<LoanDTO>("/api/loans", { barcode: data });
      Alert.alert(
        "Emprunt enregistré !",
        `"${loan.gameName}" emprunté jusqu'au ${new Date(loan.dueAt).toLocaleDateString("fr-FR")}`,
        [
          { text: "Voir le jeu", onPress: () => router.push(`/game/${loan.gameId}`) },
          { text: "OK", onPress: () => setScanned(false) },
        ]
      );
    } catch (err: any) {
      Alert.alert("Erreur", err.message, [{ text: "Réessayer", onPress: () => setScanned(false) }]);
    } finally {
      setProcessing(false);
    }
  }

  if (!permission) {
    return <View style={[s.center, { paddingTop: insets.top }]}><ActivityIndicator color={P.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <View style={s.permIcon}><Text style={{ fontSize: 40 }}>📷</Text></View>
        <Text style={s.permTitle}>Accès caméra requis</Text>
        <Text style={s.permText}>Pour scanner les codes-barres des jeux, autorisez l'accès à la caméra.</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      >
        {/* Dark overlay with transparent cutout via surrounding panels */}
        <View style={s.overlay}>
          {/* Top mask */}
          <View style={s.maskTop} />

          {/* Middle row */}
          <View style={s.maskRow}>
            <View style={s.maskSide} />

            {/* Scan frame */}
            <View style={s.frame}>
              {/* Corner brackets */}
              <View style={[s.corner, s.cornerTL]} />
              <View style={[s.corner, s.cornerTR]} />
              <View style={[s.corner, s.cornerBL]} />
              <View style={[s.corner, s.cornerBR]} />

              {/* Animated scan line */}
              {!processing && (
                <Animated.View
                  style={[s.scanLine, { transform: [{ translateY: scanLineY }] }]}
                />
              )}
              {processing && (
                <View style={s.processingOverlay}>
                  <ActivityIndicator color="#fff" size="large" />
                </View>
              )}
            </View>

            <View style={s.maskSide} />
          </View>

          {/* Bottom mask + UI */}
          <View style={s.maskBottom}>
            <Text style={s.hint}>
              {processing
                ? "Recherche en cours…"
                : scanned
                ? ""
                : "Pointez la caméra vers le code-barre du jeu"}
            </Text>
            {scanned && !processing && (
              <TouchableOpacity style={s.retryBtn} onPress={() => setScanned(false)}>
                <Text style={s.retryBtnText}>Scanner à nouveau</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const FRAME_W = 260;
const FRAME_H = 160;
const CORNER_LEN = 28;
const CORNER_W = 4;

const s = StyleSheet.create({
  center:          { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: P.bg },
  permIcon:        { marginBottom: 16 },
  permTitle:       { fontSize: 20, fontWeight: "700", color: P.ink, marginBottom: 8 },
  permText:        { fontSize: 14, color: P.ink2, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  permBtn:         { backgroundColor: P.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  permBtnText:     { color: "#fff", fontWeight: "700", fontSize: 15 },

  overlay:         { flex: 1 },
  maskTop:         { flex: 1, backgroundColor: "rgba(0,0,0,0.62)" },
  maskRow:         { flexDirection: "row", height: FRAME_H },
  maskSide:        { flex: 1, backgroundColor: "rgba(0,0,0,0.62)" },
  maskBottom:      { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", alignItems: "center", paddingTop: 28 },
  frame:           { width: FRAME_W, height: FRAME_H, overflow: "hidden" },

  corner:          { position: "absolute", borderColor: P.ocre, width: CORNER_LEN, height: CORNER_LEN },
  cornerTL:        { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: 6 },
  cornerTR:        { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: 6 },
  cornerBL:        { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: 6 },
  cornerBR:        { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: 6 },

  scanLine:        { position: "absolute", left: 12, right: 12, height: 2, backgroundColor: P.ocre, borderRadius: 1, shadowColor: P.ocre, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  processingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" },

  hint:            { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center", paddingHorizontal: 40, fontWeight: "500" },
  retryBtn:        { marginTop: 16, backgroundColor: P.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 },
  retryBtnText:    { color: "#fff", fontWeight: "700", fontSize: 14 },
});
