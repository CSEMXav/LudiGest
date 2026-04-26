import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import { apiPost } from "@/lib/api";
import type { LoanDTO } from "@ludigest/types";

export default function ScanTab() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

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

  if (!permission) return <View style={s.center}><ActivityIndicator color="#C8102E" /></View>;

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.permText}>Accès à la caméra nécessaire pour scanner les jeux.</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      >
        <View style={s.overlay}>
          <View style={s.frame} />
          <Text style={s.hint}>
            {processing ? "Recherche en cours..." : "Pointez la caméra vers le code-barre du jeu"}
          </Text>
          {scanned && !processing && (
            <TouchableOpacity style={s.btn} onPress={() => setScanned(false)}>
              <Text style={s.btnText}>Scanner à nouveau</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  permText: { textAlign: "center", color: "#6b7280", marginBottom: 16, fontSize: 15 },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  frame: { width: 260, height: 160, borderWidth: 3, borderColor: "#fff", borderRadius: 16, marginBottom: 24 },
  hint: { color: "#fff", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  btn: { marginTop: 20, backgroundColor: "#C8102E", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
