import { Tabs, useRouter } from "expo-router";
import { Text, TouchableOpacity } from "react-native";

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#C8102E",
        tabBarInactiveTintColor: "#9ca3af",
        headerStyle: { backgroundColor: "#C8102E" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push("/account")}
            style={{ marginRight: 16, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Mon compte</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Liste des jeux",
          tabBarLabel: "Liste des jeux",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎲</Text>,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Emprunter un jeu",
          tabBarLabel: "Emprunter un jeu",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📷</Text>,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: "Mes emprunts",
          tabBarLabel: "Mes emprunts",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text>,
        }}
      />
    </Tabs>
  );
}
