import { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Text, TouchableOpacity } from "react-native";
import { getStoredUser } from "@/lib/auth";

const P = {
  bg:      "#fef9f0",
  bgAlt:   "#1e1610",
  primary: "#d24a1f",
  ocre:    "#e8a82f",
  ink3:    "#9a8b7c",
};

export default function TabsLayout() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getStoredUser().then((u) => { if (u?.role === "ADMIN") setIsAdmin(true); });
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: P.primary,
        tabBarInactiveTintColor: P.ink3,
        tabBarStyle: { backgroundColor: P.bgAlt, borderTopColor: "rgba(255,255,255,0.08)" },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        headerStyle: { backgroundColor: P.bgAlt },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push("/account")}
            style={{ marginRight: 16, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }}
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
          tabBarLabel: "Jeux",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎲</Text>,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Emprunter un jeu",
          tabBarLabel: "Emprunter",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📷</Text>,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: "Mes emprunts",
          tabBarLabel: "Emprunts",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text>,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: "Soirées ludiques",
          tabBarLabel: "Soirées",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎉</Text>,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Membres",
          tabBarLabel: "Membres",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text>,
        }}
      />
      <Tabs.Screen
        name="admin-panel"
        options={{
          href: isAdmin ? undefined : null,
          title: "Admin",
          tabBarLabel: "Admin",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
