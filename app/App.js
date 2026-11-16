import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View,
} from "react-native";
import { C, s } from "./theme";
import DebriefScreen from "./DebriefScreen";
import StoriesScreen from "./StoriesScreen";
import QuizScreen from "./QuizScreen";
import MapScreen from "./MapScreen";

// Where the app downloads each day's debrief (your public GitHub repo)
const DEBRIEF_URL =
  "https://raw.githubusercontent.com/abhisingh06/macrowatch/main/data/debrief_latest.json";

const TABS = ["Debrief", "Stories", "Quiz", "Map"];

export default function App() {
  const [debrief, setDebrief] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notesOn, setNotesOn] = useState(false);
  const [tab, setTab] = useState("Debrief");
  const scrollRef = useRef(null);

  // Download the newest debrief from GitHub
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${DEBRIEF_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      setDebrief(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Switch tabs and jump back to the top
  function openTab(name) {
    setTab(name);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  return (
    <View style={a.screen}>
      <StatusBar style="light" />

      {/* Header: tab name + notes mode switch */}
      <View style={a.header}>
        {tab === "Debrief"
          ? <Text style={a.brand}>MACRO<Text style={{ color: C.accent }}>WATCH</Text></Text>
          : <Text style={a.brand}>{tab.toUpperCase()}</Text>}
        <View style={a.toggle}>
          <Text style={[a.toggleText, notesOn && { color: C.note }]}>Notes</Text>
          <Switch value={notesOn} onValueChange={setNotesOn} trackColor={{ false: C.rule, true: C.note }} thumbColor={C.ink} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={a.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />}
      >
        {!debrief && loading && <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />}

        {error && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Couldn't load today's debrief</Text>
            <Text style={s.body}>{error}. Pull down to try again. A 404 usually means the repo is still private.</Text>
          </View>
        )}

        {debrief && tab === "Debrief" && <DebriefScreen debrief={debrief} notesOn={notesOn} />}
        {debrief && tab === "Stories" && <StoriesScreen debrief={debrief} notesOn={notesOn} />}
        {debrief && tab === "Quiz" && <QuizScreen debrief={debrief} />}
        {debrief && tab === "Map" && <MapScreen debrief={debrief} notesOn={notesOn} />}

        {debrief && <Text style={a.footer}>Pull down to refresh</Text>}
      </ScrollView>

      {/* Bottom tab bar */}
      <View style={a.tabBar}>
        {TABS.map((name) => (
          <Pressable key={name} onPress={() => openTab(name)} style={a.tabButton}>
            <View style={[a.tabIcon, tab === name && { borderColor: C.accent, backgroundColor: C.accentBg }]} />
            <Text style={[a.tabText, tab === name && { color: C.accent }]}>{name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const a = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingTop: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 },
  brand: { color: C.ink, fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggleText: { color: C.muted, fontWeight: "700" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  footer: { color: C.muted, textAlign: "center", marginTop: 24, fontSize: 12 },
  tabBar: {
    flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: C.rule,
    backgroundColor: "#0b1118", paddingTop: 10, paddingBottom: 30,
  },
  tabButton: { alignItems: "center", gap: 4, minWidth: 64 },
  tabIcon: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.muted },
  tabText: { color: C.muted, fontSize: 11, fontWeight: "600" },
});
