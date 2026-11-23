import { StyleSheet, Text, View } from "react-native";
import { C, Notes, Rich, Section, plain, s } from "./theme";

const MOOD = {
  "risk-on": { text: "Risk-on day", color: C.up },
  "risk-off": { text: "Risk-off day", color: C.down },
  mixed: { text: "Mixed day", color: C.note },
};

// "2026-11-20" -> "Friday's close, Nov 20"
function closeLabel(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const day = new Date(y, m - 1, d);
  const weekday = day.toLocaleDateString("en-US", { weekday: "long" });
  const short = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${weekday}'s close, ${short}`;
}

function formatNumber(n) {
  return typeof n === "number" ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(n ?? "");
}

function formatChange(row) {
  const sign = row.change > 0 ? "+" : row.change < 0 ? "−" : "";
  return `${sign}${Math.abs(row.change)}${row.unit === "bp" ? " bp" : "%"}`;
}

// One market in the tape: name, level, and the move in green or red
function Print({ row, index }) {
  const color = row.dir === "up" ? C.up : row.dir === "down" ? C.down : C.muted;
  return (
    <View style={[d.print, index % 3 !== 0 && d.printDivider]}>
      <Text style={d.printLabel}>{row.label}</Text>
      <Text style={d.printValue}>{formatNumber(row.value)}</Text>
      <Text style={[d.printChange, { color }]}>{formatChange(row)}</Text>
    </View>
  );
}

export default function DebriefScreen({ debrief, notesOn }) {
  const mood = MOOD[debrief.mood] || MOOD.mixed;
  return (
    <>
      <View style={d.moodRow}>
        <View style={[d.dot, { backgroundColor: mood.color }]} />
        <Text style={s.label}>{mood.text} · {closeLabel(debrief.date)}</Text>
      </View>
      <Text style={d.headline}>{plain(debrief.headline)}</Text>
      <Rich style={d.summary} text={debrief.summary} />

      {debrief.one_thing ? (
        <View style={[s.card, { marginTop: 18 }]}>
          <Text style={[s.label, { color: C.accent, marginBottom: 4 }]}>If you remember one thing</Text>
          <Rich text={debrief.one_thing} />
        </View>
      ) : null}

      <Section>The tape</Section>
      <View style={d.tape}>
        {(debrief.board || []).map((row, i) => <Print key={row.label} row={row} index={i} />)}
      </View>

      <Section>How each market reacted</Section>
      {Object.entries(debrief.cross_asset || {}).map(([name, text]) => (
        <View key={name} style={d.market}>
          <Text style={d.marketName}>{name === "fx" ? "Currencies" : name.charAt(0).toUpperCase() + name.slice(1)}</Text>
          <Rich text={text} />
        </View>
      ))}
      <Notes lines={debrief.cross_asset_notes} on={notesOn} />
    </>
  );
}

const d = StyleSheet.create({
  moodRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  headline: { color: C.ink, fontSize: 28, fontWeight: "800", lineHeight: 32, letterSpacing: -0.6, marginTop: 6, marginBottom: 10 },
  summary: { color: C.body, fontSize: 16, lineHeight: 24 },
  tape: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderColor: C.rule },
  print: { width: "33.33%", paddingVertical: 12, borderBottomWidth: 1, borderColor: C.rule },
  printDivider: { borderLeftWidth: 1, paddingLeft: 12 },
  printLabel: { color: C.muted, fontSize: 12 },
  printValue: { color: C.ink, fontSize: 17, fontWeight: "700", marginTop: 2, fontVariant: ["tabular-nums"] },
  printChange: { fontSize: 13, fontWeight: "600", marginTop: 1, fontVariant: ["tabular-nums"] },
  market: { paddingVertical: 14, borderTopWidth: 1, borderColor: C.rule },
  marketName: { color: C.ink, fontSize: 16, fontWeight: "700", marginBottom: 4 },
});
