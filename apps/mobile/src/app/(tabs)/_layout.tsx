import { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity, Text } from "react-native";
import { getStoredUser } from "@/lib/auth";
import { Pion } from "@/components/Pion";

export default function TabsLayout() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getStoredUser().then((u) => { if (u?.role === "ADMIN") setIsAdmin(true); });
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#d24a1f",
        tabBarInactiveTintColor: "#9a8b7c",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#ece1cd",
          borderTopWidth: 1,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: "700" },
        headerStyle: { backgroundColor: "#d24a1f" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push("/account")}
            style={{ marginRight: 16, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>Mon compte</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarLabel: "Jeux",
          tabBarIcon: ({ focused }) => <Pion tint={focused ? "#d24a1f" : "#9a8b7c"} kind="die" w={24} h={24} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Emprunter un jeu",
          tabBarLabel: "Emprunter",
          tabBarIcon: ({ focused }) => <Pion tint={focused ? "#d24a1f" : "#9a8b7c"} kind="card" w={24} h={24} />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          headerShown: false,
          tabBarLabel: "Emprunts",
          tabBarIcon: ({ focused }) => <Pion tint={focused ? "#d24a1f" : "#9a8b7c"} kind="hex" w={24} h={24} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: "Sessions",
          tabBarLabel: "Sessions",
          tabBarIcon: ({ focused }) => <Pion tint={focused ? "#d24a1f" : "#9a8b7c"} kind="star" w={24} h={24} />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Membres",
          tabBarLabel: "Membres",
          tabBarIcon: ({ focused }) => <Pion tint={focused ? "#d24a1f" : "#9a8b7c"} kind="meeple" w={24} h={24} />,
        }}
      />
      <Tabs.Screen
        name="admin-panel"
        options={{
          href: isAdmin ? undefined : null,
          title: "Admin",
          tabBarLabel: "Admin",
          tabBarIcon: ({ focused }) => <Pion tint={focused ? "#d24a1f" : "#9a8b7c"} kind="chip" w={24} h={24} />,
        }}
      />
    </Tabs>
  );
}
