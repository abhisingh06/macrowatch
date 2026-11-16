// Shared colors, styles and small building blocks used by every screen
import { Linking, StyleSheet, Text, View } from "react-native";

export const C = {
  bg: "#0e141c", card: "#151e29", ink: "#e3e9f0", body: "#cbd5df", muted: "#94a2b3", rule: "#283545",
  accent: "#5bbfca", accentBg: "#163a40", up: "#4fc485", upBg: "#16342a",
  down: "#ef776c", downBg: "#3d1f1e", note: "#f2c66d", noteBg: "#3a3020", noteInk: "#f3e5c4",
};

// The yellow "write this down" box. Only shows when notes mode is on.
export function Notes({ lines, on }) {
  if (!on || !lines || lines.length === 0) return null;
  const list = Array.isArray(lines) ? lines : [lines];
  return (
    <View style={s.notes}>
      <Text style={[s.label, { color: C.note, marginBottom: 6 }]}>✎ Write this down</Text>
      {list.map((line, i) => <Text key={i} style={s.noteLine}>• {line}</Text>)}
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
  return (
    <Text style={[s.body, { marginBottom: 6 }]}>
      <Text style={{ color: C.ink, fontWeight: "700" }}>{name}: </Text>{children}
    </Text>
  );
}

// A tappable source link that opens in the browser
export function SourceLink({ item }) {
  if (!item?.url) return null;
  return (
    <Text style={s.link} onPress={() => Linking.openURL(item.url)}>
      ↗ {item.source}: {item.title}
    </Text>
  );
}

export const s = StyleSheet.create({
  label: { color: C.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  section: {
    color: C.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.4,
    textTransform: "uppercase", marginTop: 26, marginBottom: 10,
  },
  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.rule, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  cardTitle: { color: C.ink, fontSize: 18, fontWeight: "800", lineHeight: 23, marginTop: 4, marginBottom: 8 },
  tag: { color: C.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  body: { color: C.body, fontSize: 14, lineHeight: 21 },
  link: { color: C.accent, fontSize: 13, lineHeight: 19, marginTop: 4 },
  pill: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  notes: {
    backgroundColor: C.noteBg, borderWidth: 1, borderStyle: "dashed", borderColor: C.note,
    borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4,
  },
  noteLine: { color: C.noteInk, fontSize: 13.5, lineHeight: 20 },
});
