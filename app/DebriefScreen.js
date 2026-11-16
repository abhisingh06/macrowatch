import { StyleSheet, Text, View } from "react-native";
import { C, Notes, Section, s } from "./theme";

const MOOD = {
  "risk-on": { text: "Risk-on day", color: C.up, bg: C.upBg },
  "risk-off": { text: "Risk-off day", color: C.down, bg: C.downBg },
  mixed: { text: "Mixed day", color: C.accent, bg: C.accentBg },
};

function formatNumber(n) {
  return typeof n === "number" ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(n ?? "");
}

// One box in the tape grid
function Print({ row }) {
  const arrow = row.dir === "up" ? "▲ " : row.dir === "down" ? "▼ " : "";
  const color = row.dir === "up" ? C.up : row.dir === "down" ? C.down : C.muted;
  const sign = row.change > 0 ? "+" : "";
  const unit = row.unit === "bp" ? " bp" : "%";
  return (
    <View style={d.print}>
      <Text style={s.label}>{row.label}</Text>
      <Text style={d.printValue}>{formatNumber(row.value)}</Text>
      <Text style={[d.printChange, { color }]}>{arrow}{sign}{row.change}{unit}</Text>
    </View>
  );
}

export default function DebriefScreen({ debrief, notesOn }) {
  const mood = MOOD[debrief.mood] || MOOD.mixed;
  return (
    <>
      <Text style={s.label}>Market close · {debrief.date}</Text>
      <Text style={d.headline}>{debrief.headline}</Text>
      <View style={[s.pill, { alignSelf: "flex-start", backgroundColor: mood.bg, paddingHorizontal: 10, paddingVertical: 5 }]}>
        <Text style={[s.pillText, { color: mood.color }]}>{mood.text}</Text>
      </View>
      <Text style={d.summary}>{debrief.summary}</Text>

      {debrief.one_thing ? (
        <View style={d.oneThing}>
          <Text style={s.label}>If you remember one thing</Text>
          <Text style={s.body}>{debrief.one_thing}</Text>
        </View>
      ) : null}

      <Section>The tape</Section>
      <View style={d.tape}>
        {(debrief.board || []).map((row) => <Print key={row.label} row={row} />)}
      </View>

      <Section>How each market reacted</Section>
      {Object.entries(debrief.cross_asset || {}).map(([name, text]) => (
        <View key={name} style={s.card}>
          <Text style={[s.tag, { marginBottom: 6 }]}>{name}</Text>
          <Text style={s.body}>{text}</Text>
        </View>
      ))}
      <Notes lines={debrief.cross_asset_notes} on={notesOn} />
    </>
  );
}

const d = StyleSheet.create({
  headline: { color: C.ink, fontSize: 28, fontWeight: "800", lineHeight: 32, marginTop: 6, marginBottom: 10 },
  summary: { color: C.body, fontSize: 15, lineHeight: 22, marginTop: 12 },
  oneThing: { borderLeftWidth: 3, borderLeftColor: C.accent, paddingLeft: 12, marginTop: 14, gap: 4 },
  tape: { flexDirection: "row", flexWrap: "wrap", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.rule },
  print: { width: "33.33%", backgroundColor: C.card, padding: 10, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.rule },
  printValue: { color: C.ink, fontSize: 16, fontWeight: "700", marginTop: 4, fontVariant: ["tabular-nums"] },
  printChange: { fontSize: 12, fontWeight: "700", marginTop: 2, fontVariant: ["tabular-nums"] },
});
