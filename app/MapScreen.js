import { useMemo, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from "react-native-svg";
import { C, Field, Notes, Section, s } from "./theme";

const R = 34;          // bubble size
const ROW = 118;       // space between layers of the map

// Split a label into at most 2 short lines so it fits inside a bubble
function wrap(label) {
  const words = String(label).split(" ");
  const lines = [""];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + " " + w).trim().length > 10 && cur && lines.length < 2) lines.push(w);
    else lines[lines.length - 1] = (cur + " " + w).trim();
  }
  return lines;
}

// Put causes at the top and effects underneath, layer by layer
function layout(nodes, edges, width) {
  const depth = Object.fromEntries(nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < nodes.length; pass++) {
    for (const e of edges) {
      if (depth[e.from] !== undefined && depth[e.to] !== undefined) {
        depth[e.to] = Math.min(nodes.length, Math.max(depth[e.to], depth[e.from] + 1));
      }
    }
  }
  const rows = {};
  nodes.forEach((n) => { (rows[depth[n.id]] = rows[depth[n.id]] || []).push(n); });
  const levels = Object.keys(rows).map(Number).sort((a, b) => a - b);
  const pos = {};
  levels.forEach((lvl, row) => {
    const list = rows[lvl];
    list.forEach((n, i) => {
      const stagger = list.length > 3 ? (i % 2 ? 22 : -22) : 0;
      pos[n.id] = { x: (width * (i + 1)) / (list.length + 1), y: 50 + row * ROW + stagger };
    });
  });
  return { pos, height: 50 + (levels.length - 1) * ROW + 70 };
}

function moveText(n) {
  if (n.change === undefined) return n.kind === "driver" ? "driver" : "";
  const sign = n.change > 0 ? "+" : "";
  return `${sign}${n.change}${n.unit === "bp" ? " bp" : "%"}`;
}

function colors(n) {
  if (n.kind === "driver" || n.dir === undefined) return { stroke: C.accent, fill: C.card, text: C.accent };
  if (n.dir === "up") return { stroke: C.up, fill: C.upBg, text: C.up };
  if (n.dir === "down") return { stroke: C.down, fill: C.downBg, text: C.down };
  return { stroke: C.muted, fill: C.card, text: C.muted };
}

export default function MapScreen({ debrief, notesOn }) {
  const map = debrief.market_map || { nodes: [], edges: [] };
  const nodes = map.nodes || [];
  const edges = (map.edges || []).filter((e) => e.from !== e.to);
  const width = Dimensions.get("window").width - 32;
  const { pos, height } = useMemo(() => layout(nodes, edges, width), [debrief.date, width]);
  const [selected, setSelected] = useState(null);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  if (nodes.length === 0) {
    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>No map yet</Text>
        <Text style={s.body}>The next debrief will include today's Market Map.</Text>
      </View>
    );
  }

  const active = selected ? byId[selected] : null;
  const into = edges.filter((e) => e.to === selected);
  const outOf = edges.filter((e) => e.from === selected);

  return (
    <>
      <Text style={s.label}>How today's moves connect · {debrief.date}</Text>
      <Text style={[s.body, { marginTop: 6 }]}>Tap a bubble to see what pushed it and what it pushed.</Text>

      <Svg width={width} height={height} style={{ marginTop: 6 }}>
        {/* Arrows */}
        {edges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to];
          if (!a || !b) return null;
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const ux = dx / len, uy = dy / len;
          const x1 = a.x + ux * R, y1 = a.y + uy * R;
          const x2 = b.x - ux * (R + 3), y2 = b.y - uy * (R + 3);
          const lit = selected && (e.from === selected || e.to === selected);
          const color = lit ? C.note : "#3a4a5e";
          const head = `${x2},${y2} ${x2 - ux * 10 - uy * 6},${y2 - uy * 10 + ux * 6} ${x2 - ux * 10 + uy * 6},${y2 - uy * 10 - ux * 6}`;
          return (
            <G key={i}>
              <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={lit ? 3 : 2} />
              <Polygon points={head} fill={color} />
            </G>
          );
        })}

        {/* Bubbles */}
        {nodes.map((n) => {
          const p = pos[n.id];
          if (!p) return null;
          const col = colors(n);
          const lines = wrap(n.label);
          const on = selected === n.id;
          return (
            <G key={n.id} onPress={() => setSelected(on ? null : n.id)}>
              <Circle
                cx={p.x} cy={p.y} r={R} fill={col.fill}
                stroke={on ? C.note : col.stroke} strokeWidth={on ? 3 : 2}
                strokeDasharray={n.kind === "driver" ? "4 3" : undefined}
              />
              {lines.map((line, i) => (
                <SvgText
                  key={i} x={p.x} y={p.y - (lines.length === 2 ? 12 : 4) + i * 13}
                  fill={C.ink} fontSize="11" fontWeight="bold" textAnchor="middle"
                >{line}</SvgText>
              ))}
              <SvgText x={p.x} y={p.y + (lines.length === 2 ? 17 : 12)} fill={col.text} fontSize="10.5" textAnchor="middle">
                {moveText(n)}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: "row", gap: 14, marginBottom: 6 }}>
        <Text style={[s.label, { color: C.up }]}>● up</Text>
        <Text style={[s.label, { color: C.down }]}>● down</Text>
        <Text style={[s.label, { color: C.accent }]}>◌ driver (an idea, not traded)</Text>
      </View>

      {active ? (
        <View style={[s.card, { borderColor: C.note }]}>
          <Text style={s.tag}>{active.kind === "driver" ? "Driver" : "Market"} {moveText(active) && `· ${moveText(active)}`}</Text>
          <Text style={s.cardTitle}>{active.label}</Text>
          {into.length > 0 && <Text style={[s.label, { marginBottom: 6 }]}>What pushed it</Text>}
          {into.map((e, i) => <Field key={`in${i}`} name={`${byId[e.from]?.label} ${e.effect}`}>{e.why}</Field>)}
          {outOf.length > 0 && <Text style={[s.label, { marginVertical: 6 }]}>What it pushed</Text>}
          {outOf.map((e, i) => <Field key={`out${i}`} name={`${e.effect} ${byId[e.to]?.label}`}>{e.why}</Field>)}
          <Pressable onPress={() => setSelected(null)}><Text style={s.link}>Show every link</Text></Pressable>
        </View>
      ) : (
        <>
          <Section>Every link today</Section>
          {edges.map((e, i) => (
            <View key={i} style={s.card}>
              <Text style={s.tag}>{byId[e.from]?.label} → {byId[e.to]?.label}</Text>
              <Text style={[s.body, { marginTop: 4 }]}>
                <Text style={{ color: C.ink, fontWeight: "700" }}>{e.effect}. </Text>{e.why}
              </Text>
            </View>
          ))}
        </>
      )}
      <Notes lines={debrief.cross_asset_notes} on={notesOn} />
    </>
  );
}
