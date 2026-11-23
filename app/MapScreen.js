import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, Notes, Rich, plain, s } from "./theme";

const DEFAULT_LINKS = ["which means", "so", "and then", "which means"];

// The move on the right of a step: the real number, or an arrow for ideas like "Fed hike odds"
function Move({ step }) {
  if (step.change !== undefined) {
    const sign = step.change > 0 ? "+" : step.change < 0 ? "−" : "";
    const color = step.dir === "up" ? C.up : step.dir === "down" ? C.down : C.muted;
    return <Text style={[m.move, { color }]}>{sign}{Math.abs(step.change)}{step.unit === "bp" ? " bp" : "%"}</Text>;
  }
  if (step.direction === "up") return <Text style={[m.move, { color: C.accent }]}>↑</Text>;
  if (step.direction === "down") return <Text style={[m.move, { color: C.accent }]}>↓</Text>;
  return null;
}

function Step({ step, number, last, link, onFocus }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={m.stepRow}>
      {/* Left rail: numbered circle and the line down to the next step */}
      <View style={m.rail}>
        <View style={m.num}><Text style={m.numText}>{number}</Text></View>
        {!last && <View style={m.line} />}
      </View>

      <View style={{ flex: 1 }}>
        <Pressable onPress={() => { setOpen(!open); if (step.board_label && onFocus) onFocus(step.board_label); }} style={[m.body, open && m.bodyOpen]}>
          <View style={m.head}>
            <Text style={m.label}>{plain(step.label)}</Text>
            <Move step={step} />
          </View>
          <Rich style={m.explain} text={step.explain} />
          {open && step.detail ? (
            <View style={m.more}><Rich style={m.explain} text={step.detail} /></View>
          ) : null}
        </Pressable>
        {!last && <Text style={m.link}>{link}</Text>}
      </View>
    </View>
  );
}

export default function MapScreen({ debrief, notesOn, onFocus }) {
  const chains = debrief.market_chains || [];
  const [pick, setPick] = useState(0);

  if (chains.length === 0) {
    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>No map yet</Text>
        <Text style={s.body}>The next debrief will include today's Market Map.</Text>
      </View>
    );
  }

  const chain = chains[Math.min(pick, chains.length - 1)];
  const steps = chain.steps || [];

  return (
    <>
      {/* Pick which chain to read */}
      <View style={m.tabs}>
        {chains.map((c, i) => (
          <Pressable key={i} onPress={() => setPick(i)} style={[m.tab, i === pick && m.tabOn]}>
            <Text style={[m.tabText, i === pick && { color: C.ink }]}>{plain(c.title)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[s.body, { color: C.muted, marginBottom: 18 }]}>
        Each step caused the one below it. Tap a step to go deeper.
      </Text>

      {steps.map((step, i) => (
        <Step
          key={`${pick}-${i}`}
          step={step}
          number={i + 1}
          last={i === steps.length - 1}
          link={(chain.links || [])[i] || DEFAULT_LINKS[i]}
          onFocus={onFocus}
        />
      ))}

      <Notes lines={debrief.cross_asset_notes} on={notesOn} />
    </>
  );
}

const m = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 20, borderBottomWidth: 1, borderColor: C.rule, marginBottom: 16 },
  tab: { paddingVertical: 10 },
  tabOn: { borderBottomWidth: 2, borderColor: C.accent, marginBottom: -1 },
  tabText: { color: C.muted, fontSize: 16, fontWeight: "600" },
  stepRow: { flexDirection: "row", gap: 14 },
  rail: { width: 32, alignItems: "center" },
  num: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: C.accent,
    alignItems: "center", justifyContent: "center", backgroundColor: C.bg,
  },
  numText: { color: C.accent, fontWeight: "800", fontSize: 14 },
  line: { width: 2, flex: 1, backgroundColor: "rgba(60,200,192,0.35)", marginVertical: 2 },
  body: { paddingTop: 4, paddingBottom: 2 },
  bodyOpen: { backgroundColor: C.card, borderRadius: 14, padding: 12, marginTop: -6, marginLeft: -4 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 10 },
  label: { color: C.ink, fontSize: 17, fontWeight: "700", flex: 1, letterSpacing: -0.2 },
  move: { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  explain: { color: C.body, fontSize: 14, lineHeight: 20, marginTop: 2 },
  more: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: C.rule },
  link: { color: C.muted, fontStyle: "italic", fontSize: 13, paddingTop: 8, paddingBottom: 12 },
});
