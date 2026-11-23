import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator, AppState, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Polyline } from "react-native-svg";
import { C, DATA_URL, TermContext, s } from "./theme";
import DebriefScreen from "./DebriefScreen";
import StoriesScreen from "./StoriesScreen";
import QuizScreen from "./QuizScreen";
import MapScreen from "./MapScreen";
import ChartsPanel from "./ChartsPanel";

// Where the app downloads each day's debrief (your public GitHub repo)
const DEBRIEF_URL = `${DATA_URL}debrief_latest.json`;

// Tab id, name shown on screen, icon, and a one-line description for the desktop header
const TABS = [
  ["Debrief", "Today", "newspaper", "The close in plain English"],
  ["Stories", "Stories", "book", "The stories behind the moves"],
  ["Quiz", "Quiz", "school", "Check what you learned"],
  ["Map", "Map", "git-network", "How today's moves connect"],
];

// The MacroWatch globe logo, drawn in code so it stays sharp at any size
function Logo({ size = 28 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Circle cx="256" cy="256" r="236" fill="#1fa8a0" />
      <Ellipse cx="256" cy="256" rx="236" ry="84" fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={10} />
      <Ellipse cx="256" cy="256" rx="92" ry="236" fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={10} />
      <Line x1="20" y1="256" x2="492" y2="256" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={10} />
      <Polyline points="116,380 116,140 256,300 396,140 396,380" fill="none" stroke="#ffffff"
        strokeWidth={48} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function lastChecked(at) {
  return at ? `Updated ${at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Loading…";
}

export default function App() {
  const [debrief, setDebrief] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notesOn, setNotesOn] = useState(false);
  const [tab, setTab] = useState("Debrief");
  const [term, setTerm] = useState(null);       // the key term whose sheet is open
  const [focus, setFocus] = useState(null);     // market highlighted in the charts panel
  const [checkedAt, setCheckedAt] = useState(null);
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;                // laptop-sized window: sidebar + charts layout
  const showCharts = width >= 1180;             // wide enough for the charts column too
  const scrollRef = useRef(null);

  // Find a term's definition in today's glossary (ignoring capital letters)
  const glossary = debrief?.glossary || {};
  const termKey = term && Object.keys(glossary).find((k) => k.toLowerCase() === term.toLowerCase());
  const entry = termKey ? glossary[termKey] : null;

  // Download the newest debrief. silent = refresh in the background without the spinner
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

  const current = TABS.find((t) => t[0] === tab);

  const notesSwitch = (
    <View style={a.toggle}>
      <Text style={a.toggleText}>Notes</Text>
      <Switch value={notesOn} onValueChange={setNotesOn} trackColor={{ false: C.raised, true: C.accent }} thumbColor="#ffffff" />
    </View>
  );

  // The page itself (same on phone and desktop)
  const page = (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={desktop ? a.deskContent : a.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={desktop ? undefined : <RefreshControl refreshing={loading} onRefresh={() => load()} tintColor={C.accent} />}
    >
      {!debrief && loading && <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />}
      {error && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Couldn't load today's debrief</Text>
          <Text style={s.body}>{error}. Try again in a minute.</Text>
        </View>
      )}
      {debrief && tab === "Debrief" && <DebriefScreen debrief={debrief} notesOn={notesOn} />}
      {debrief && tab === "Stories" && <StoriesScreen debrief={debrief} notesOn={notesOn} />}
      {debrief && tab === "Quiz" && <QuizScreen debrief={debrief} />}
      {debrief && tab === "Map" && <MapScreen debrief={debrief} notesOn={notesOn} onFocus={setFocus} />}
      {debrief && !desktop && <Text style={a.footer}>{lastChecked(checkedAt)} · updates on its own</Text>}
    </ScrollView>
  );

  return (
    <TermContext.Provider value={{ open: setTerm }}>
      <View style={[a.screen, desktop && { paddingTop: 0 }]}>
        <StatusBar style="light" />

        {desktop ? (
          // ---------- Desktop: sidebar on the left, page in the middle, charts on the right ----------
          <View style={a.desk}>
            <View style={a.sidebar}>
              <View style={a.logoRow}>
                <Logo size={30} />
                <Text style={a.brand}>Macro<Text style={{ color: C.accent }}>Watch</Text></Text>
              </View>

              <View style={{ gap: 4, marginTop: 28 }}>
                {TABS.map(([name, label, icon]) => {
                  const on = tab === name;
                  return (
                    <Pressable key={name} onPress={() => openTab(name)} style={({ hovered }) => [a.navItem, hovered && a.navHover, on && a.navOn]}>
                      <Ionicons name={on ? icon : `${icon}-outline`} size={19} color={on ? C.accent : C.body} />
                      <Text style={[a.navText, on && { color: C.ink }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ flex: 1 }} />
              <View style={a.sideBottom}>
                {notesSwitch}
                <Pressable onPress={() => load()} style={a.refresh}>
                  <Ionicons name="refresh" size={14} color={C.muted} />
                  <Text style={a.small}>{loading ? "Refreshing…" : lastChecked(checkedAt)}</Text>
                </Pressable>
              </View>
            </View>

            <View style={a.deskMain}>
              <View style={a.deskInner}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={a.deskHeader}>
                    <Text style={a.deskTitle}>{current[1]}</Text>
                    <Text style={a.deskSub}>{current[3]}</Text>
                  </View>
                  {page}
                </View>
                {showCharts && debrief && (
                  <View style={a.chartsCol}>
                    <ChartsPanel date={debrief.date} focus={focus} onFocus={setFocus} />
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          // ---------- Phone: header on top, tabs on the bottom ----------
          <>
            <View style={a.header}>
              {tab === "Debrief"
                ? (
                  <View style={a.logoRow}>
                    <Logo size={24} />
                    <Text style={a.brand}>Macro<Text style={{ color: C.accent }}>Watch</Text></Text>
                  </View>
                )
                : <Text style={a.title}>{current[1]}</Text>}
              {notesSwitch}
            </View>
            {page}
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
          </>
        )}

        {/* Key term sheet: slides up when you tap a highlighted word */}
        <Modal visible={!!term} transparent animationType={desktop ? "fade" : "slide"} onRequestClose={() => setTerm(null)}>
          <View style={[{ flex: 1 }, desktop && a.dialogWrap]}>
            <Pressable style={desktop ? StyleSheet.absoluteFill : { flex: 1 }} onPress={() => setTerm(null)}>
              <View style={[{ flex: 1 }, a.backdrop]} />
            </Pressable>
            <View style={desktop ? a.dialog : a.sheet}>
              {!desktop && <View style={a.grab} />}
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
          </View>
        </Modal>
      </View>
    </TermContext.Provider>
  );
}

const a = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingTop: 60 },

  // phone
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brand: { color: C.ink, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  title: { color: C.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleText: { color: C.body, fontSize: 14 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  footer: { color: C.muted, textAlign: "center", marginTop: 28, fontSize: 12 },
  tabBar: {
    flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: C.rule,
    backgroundColor: C.bg, paddingTop: 10, paddingBottom: 30,
  },
  tabButton: { alignItems: "center", gap: 3, minWidth: 64 },
  tabText: { color: C.muted, fontSize: 11, fontWeight: "600" },

  // desktop
  desk: { flex: 1, flexDirection: "row" },
  sidebar: { width: 232, backgroundColor: "#0e1215", borderRightWidth: 1, borderColor: C.rule, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 20 },
  navItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  navHover: { backgroundColor: C.card },
  navOn: { backgroundColor: C.accentBg },
  navText: { color: C.body, fontSize: 15, fontWeight: "600" },
  sideBottom: { gap: 14, borderTopWidth: 1, borderColor: C.rule, paddingTop: 16 },
  refresh: { flexDirection: "row", alignItems: "center", gap: 6 },
  small: { color: C.muted, fontSize: 12 },
  deskMain: { flex: 1 },
  deskInner: { flex: 1, flexDirection: "row", gap: 32, width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: 40 },
  deskHeader: { paddingTop: 32, paddingBottom: 18, borderBottomWidth: 1, borderColor: C.rule, marginBottom: 4 },
  deskTitle: { color: C.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.7 },
  deskSub: { color: C.muted, fontSize: 14, marginTop: 4 },
  deskContent: { paddingTop: 24, paddingBottom: 60, maxWidth: 760 },
  chartsCol: { width: 340, paddingTop: 32 },

  // key term sheet (phone) / dialog (desktop)
  backdrop: { backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { backgroundColor: C.sheet, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 40 },
  dialogWrap: { justifyContent: "center", alignItems: "center" },
  dialog: { backgroundColor: C.sheet, borderRadius: 20, padding: 26, width: 460, maxWidth: "90%" },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: "#3a4246", alignSelf: "center", marginBottom: 18 },
  sheetTitle: { color: C.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.4, marginBottom: 8 },
  extra: { flexDirection: "row", gap: 12, marginTop: 16 },
  extraTitle: { color: C.ink, fontSize: 13, fontWeight: "700", marginBottom: 2 },
  close: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 24 },
  closeText: { color: C.accentInk, fontWeight: "700", fontSize: 16 },
});
