// Shared colors, styles and small building blocks used by every screen
import { createContext, useContext } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Where the app downloads data from (your public GitHub repo)
export const DATA_URL = "https://raw.githubusercontent.com/abhisingh06/macrowatch/main/data/";

// Lets any screen open the "key term" sheet
export const TermContext = createContext({ open: () => {} });

// Remove [[ ]] markers for places that show plain text (titles, labels)
export function plain(text) {
  return String(text ?? "").replace(/\[\[|\]\]/g, "");
}

// Text where [[terms]] become highlighted words you can tap
export function Rich({ text, style, lead, prefix }) {
  const { open } = useContext(TermContext);
  if (!text) return null;
  const parts = String(text).split(/(\[\[[^\]]+\]\])/g);
  return (
    <Text style={style || s.body}>
      {lead ? <Text style={{ color: C.ink, fontWeight: "700" }}>{lead}: </Text> : null}
      {prefix || null}
      {parts.map((part, i) => {
        const m = part.match(/^\[\[([^\]]+)\]\]$/);
        if (!m) return part;
        return (
          <Text key={i} style={s.term} onPress={() => open(m[1])}>{m[1]}</Text>
        );
      })}
    </Text>
  );
}

export const C = {
  bg: "#0a0c0e", card: "#13171a", sheet: "#1a1f23", ink: "#eef2f3", body: "#b9c2c6", muted: "#7b878d",
  rule: "#22292d", raised: "#2a3135",
  accent: "#3cc8c0", accentBg: "rgba(60,200,192,0.13)", accentInk: "#05201e",
  up: "#3fd98a", upBg: "rgba(63,217,138,0.14)", down: "#ff6b5e", downBg: "rgba(255,107,94,0.14)",
  note: "#e9c46a", noteBg: "rgba(233,196,106,0.10)", noteInk: "#f1e3bd",
};

// The yellow "write this down" box. Only shows when notes mode is on.
export function Notes({ lines, on }) {
  if (!on || !lines || lines.length === 0) return null;
  const list = Array.isArray(lines) ? lines : [lines];
  return (
    <View style={s.notes}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Ionicons name="create-outline" size={16} color={C.note} />
        <Text style={[s.label, { color: C.note }]}>Write this down</Text>
      </View>
      {list.map((line, i) => <Rich key={i} style={s.noteLine} prefix="• " text={line} />)}
    </View>
  );
}

// A section heading like "THE TAPE"
export function Section({ children }) {
  return <Text style={s.section}>{children}</Text>;
}

// A bold lead-in followed by text, like "Backstory: ..."
export function Field({ name, children }) {
  if (!children) return null;
  return <Rich style={[s.body, { marginBottom: 6 }]} lead={name} text={children} />;
}

// A tappable source link that opens in the browser
export function SourceLink({ item }) {
  if (!item?.url) return null;
  return (
    <Text style={s.link} onPress={() => Linking.openURL(item.url)}>
      ↗ {item.source}: {plain(item.title)}
    </Text>
  );
}

export const s = StyleSheet.create({
  label: { color: C.muted, fontSize: 13, fontWeight: "500" },
  section: { color: C.ink, fontSize: 20, fontWeight: "800", letterSpacing: -0.3, marginTop: 30, marginBottom: 12 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10 },
  cardTitle: { color: C.ink, fontSize: 18, fontWeight: "700", lineHeight: 23, marginTop: 2, marginBottom: 8, letterSpacing: -0.2 },
  tag: { color: C.accent, fontSize: 13, fontWeight: "600" },
  body: { color: C.body, fontSize: 15, lineHeight: 22 },
  link: { color: C.accent, fontSize: 14, lineHeight: 20, marginTop: 6 },
  pill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  pillText: { fontSize: 12, fontWeight: "600" },
  term: {
    color: C.accent, fontWeight: "600", textDecorationLine: "underline",
    textDecorationColor: "rgba(60,200,192,0.45)",
  },
  notes: { backgroundColor: C.noteBg, borderRadius: 12, padding: 12, marginTop: 10, marginBottom: 4 },
  noteLine: { color: C.noteInk, fontSize: 14, lineHeight: 20 },
});
