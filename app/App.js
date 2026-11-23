import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator, AppState, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, DATA_URL, TermContext, s } from "./theme";
import DebriefScreen from "./DebriefScreen";
import StoriesScreen from "./StoriesScreen";
import QuizScreen from "./QuizScreen";
import MapScreen from "./MapScreen";

// Where the app downloads each day's debrief (your public GitHub repo)
const DEBRIEF_URL = `${DATA_URL}debrief_latest.json`;

// Tab name shown on screen, and its icon
const TABS = [
  ["Debrief", "Today", "newspaper"],
  ["Stories", "Stories", "book"],
  ["Quiz", "Quiz", "school"],
  ["Map", "Map", "git-network"],
];

export default function App() {
  const [debrief, setDebrief] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notesOn, setNotesOn] = useState(false);
  const [tab, setTab] = useState("Debrief");
  const [term, setTerm] = useState(null);       // the key term whose sheet is open
  const scrollRef = useRef(null);

  // Find a term's definition in today's glossary (ignoring capital letters)
  const glossary = debrief?.glossary || {};
  const termKey = term && Object.keys(glossary).find((k) => k.toLowerCase() === term.toLowerCase());
  const entry = termKey ? glossary[termKey] : null;

  // Download the newest debrief from GitHub
  const [checkedAt, setCheckedAt] = useState(null);

  // silent = refresh in the background without the spinner
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${DEBRIEF_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      const fresh = await res.json();
      // only swap in the new debrief if it changed, so you don't lose your place
      setDebrief((old) => (old && old.date === fresh.date && old.headline === fresh.headline ? old : fresh));
      setError(null);
      setCheckedAt(new Date());
    } catch (e) {
      if (!silent) setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Check for a new debrief whenever you come back to the app, and every 10 minutes while it's open
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") load(true); });
    const timer = setInterval(() => load(true), 10 * 60 * 1000);
    return () => { sub.remove(); clearInterval(timer); };
  }, [load]);

  // Switch tabs and jump back to the top
  function openTab(name) {
    setTab(name);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  return (
    <TermContext.Provider value={{ open: setTerm }}>
    <View style={a.screen}>
      <StatusBar style="light" />

      {/* Header: tab name + notes mode switch */}
      <View style={a.header}>
        {tab === "Debrief"
          ? <Text style={a.brand}>Macro<Text style={{ color: C.accent }}>Watch</Text></Text>
          : <Text style={a.title}>{TABS.find((t) => t[0] === tab)[1]}</Text>}
        <View style={a.toggle}>
          <Text style={a.toggleText}>Notes</Text>
          <Switch value={notesOn} onValueChange={setNotesOn} trackColor={{ false: C.raised, true: C.accent }} thumbColor="#ffffff" />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={a.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} tintColor={C.accent} />}
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

        {debrief && (
          <Text style={a.footer}>
            Updates on its own{checkedAt ? ` · last checked ${checkedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
          </Text>
        )}
      </ScrollView>

      {/* Bottom tab bar */}
      <View style={a.tabBar}>
        {TABS.map(([name, label, icon]) => {
          const on = tab === name;
          return (
            <Pressable key={name} onPress={() => openTab(name)} style={a.tabButton}>
              <Ionicons name={on ? icon : `${icon}-outline`} size={23} color={on ? C.accent : C.muted} />
              <Text style={[a.tabText, on && { color: C.accent }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Key term sheet: slides up when you tap a highlighted word */}
      <Modal visible={!!term} transparent animationType="slide" onRequestClose={() => setTerm(null)}>
        <Pressable style={a.backdrop} onPress={() => setTerm(null)} />
        <View style={a.sheet}>
          <View style={a.grab} />
          <Text style={a.sheetTitle}>{termKey || term}</Text>
          <Text style={s.body}>{entry?.def || "No definition saved for this term yet."}</Text>
          {entry?.analogy ? (
            <View style={a.extra}>
              <Ionicons name="bulb-outline" size={20} color={C.accent} />
              <View style={{ flex: 1 }}>
                <Text style={a.extraTitle}>Think of it like</Text>
                <Text style={s.body}>{entry.analogy}</Text>
              </View>
            </View>
          ) : null}
          {entry?.today ? (
            <View style={a.extra}>
              <Ionicons name="pulse-outline" size={20} color={C.up} />
              <View style={{ flex: 1 }}>
                <Text style={a.extraTitle}>Today</Text>
                <Text style={s.body}>{entry.today}</Text>
              </View>
            </View>
          ) : null}
          <Pressable style={a.close} onPress={() => setTerm(null)}>
            <Text style={a.closeText}>Got it</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
    </TermContext.Provider>
  );
}

const a = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingTop: 60 },
  header: { width: "100%", maxWidth: 760, alignSelf: "center", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14 },
  brand: { color: C.ink, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  title: { color: C.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggleText: { color: C.muted, fontSize: 14 },
  content: { paddingHorizontal: 20, paddingBottom: 40, width: "100%", maxWidth: 760, alignSelf: "center" },
  footer: { color: C.muted, textAlign: "center", marginTop: 28, fontSize: 12 },
  tabBar: {
    flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: C.rule,
    backgroundColor: C.bg, paddingTop: 10, paddingBottom: 30,
  },
  tabButton: { alignItems: "center", gap: 3, minWidth: 64 },
  tabText: { color: C.muted, fontSize: 11, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { backgroundColor: C.sheet, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 40 },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: "#3a4246", alignSelf: "center", marginBottom: 18 },
  sheetTitle: { color: C.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.4, marginBottom: 8 },
  extra: { flexDirection: "row", gap: 12, marginTop: 16 },
  extraTitle: { color: C.ink, fontSize: 13, fontWeight: "700", marginBottom: 2 },
  close: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 24 },
  closeText: { color: C.accentInk, fontWeight: "700", fontSize: 16 },
});
