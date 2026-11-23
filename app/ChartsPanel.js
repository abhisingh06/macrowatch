import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { C, DATA_URL, s } from "./theme";

const MARKETS = ["S&P 500", "Nasdaq", "Dow", "10Y yield", "Dollar index", "USD/JPY", "WTI crude", "Gold", "VIX"];

// Turn a list of numbers into a line (and a filled area under it) that fits a box
function linePath(values, width, height, pad = 4) {
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)} ${height} L${x(0).toFixed(1)} ${height} Z`;
  return { line, area, end: { x: x(values.length - 1), y: y(values[values.length - 1]) }, y };
}

// One market: name, latest level, 3-month move and a small line chart
function MiniChart({ name, points, focused, onPress }) {
  const W = 300, H = 64;
  if (!points || points.length < 2) return null;
  const values = points.map((p) => p[1]);
  const first = values[0], last = values[values.length - 1];
  const change = name === "10Y yield" ? Math.round((last - first) * 100) : ((last - first) / first) * 100;
  const up = last >= first;
  const color = up ? C.up : C.down;
  const { line, area, end } = linePath(values, W, H);
  const changeText = name === "10Y yield"
    ? `${change > 0 ? "+" : ""}${change} bp`
    : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;

  return (
    <Pressable onPress={onPress} style={[c.mini, focused && c.focused]}>
      <View style={c.miniHead}>
        <Text style={c.name}>{name}</Text>
        <Text style={c.value}>{last.toLocaleString("en-US", { maximumFractionDigits: 2 })}</Text>
      </View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Path d={area} fill={color} opacity={0.12} />
        <Path d={line} stroke={color} strokeWidth={2} fill="none" />
        <Circle cx={end.x} cy={end.y} r={3.5} fill={color} />
      </Svg>
      <Text style={[c.sub, { color }]}>{changeText} over 3 months</Text>
    </Pressable>
  );
}

// 10-year minus 2-year yield gap, with a zero line (below zero = "inverted")
function CurveChart({ history }) {
  const W = 300, H = 120;
  if (!history || history.length < 2) return null;
  const values = history.map((p) => p[1]);
  const all = [...values, 0];
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  const x = (i) => 4 + (i / (values.length - 1)) * (W - 8);
  const y = (v) => 10 + (1 - (v - min) / span) * (H - 20);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];
  return (
    <View style={c.card}>
      <Text style={c.title}>Yield curve gap</Text>
      <Text style={c.explain}>
        10-year minus 2-year yield. Above zero is normal. Below zero ("inverted") means traders expect rate cuts or a slowdown.
      </Text>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke={C.muted} strokeDasharray="4 4" strokeWidth={1} />
        <Path d={line} stroke={C.accent} strokeWidth={2} fill="none" />
        <Circle cx={x(values.length - 1)} cy={y(last)} r={3.5} fill={C.accent} />
        <SvgText x={W - 4} y={y(0) - 4} fill={C.muted} fontSize="10" textAnchor="end">0</SvgText>
      </Svg>
      <Text style={[c.sub, { color: C.accent }]}>Now {last > 0 ? "+" : ""}{last} bp · {history[0][0]} to {history[history.length - 1][0]}</Text>
    </View>
  );
}

// Central bank rates as bars, highest first
function RatesChart({ banks }) {
  if (!banks || banks.length === 0) return null;
  const sorted = [...banks].sort((a, b) => b.rate - a.rate);
  const max = Math.max(...sorted.map((b) => b.rate), 1);
  return (
    <View style={c.card}>
      <Text style={c.title}>Central bank rates</Text>
      <Text style={c.explain}>The gaps between these rates drive a lot of currency moves.</Text>
      {sorted.map((b) => (
        <View key={b.code} style={c.barRow}>
          <Text style={c.barLabel}>{b.code}</Text>
          <View style={c.barTrack}>
            <View style={[c.bar, { width: `${Math.max(2, (b.rate / max) * 100)}%` }]} />
          </View>
          <Text style={c.barValue}>{b.rate.toFixed(2)}%</Text>
        </View>
      ))}
    </View>
  );
}

export default function ChartsPanel({ date, focus, onFocus }) {
  const [history, setHistory] = useState(null);
  const [rates, setRates] = useState(null);

  // Download chart data whenever a new debrief arrives
  useEffect(() => {
    const t = Date.now();
    fetch(`${DATA_URL}history.json?t=${t}`).then((r) => (r.ok ? r.json() : null)).then(setHistory).catch(() => setHistory(null));
    fetch(`${DATA_URL}rates.json?t=${t}`).then((r) => (r.ok ? r.json() : null)).then(setRates).catch(() => setRates(null));
  }, [date]);

  const series = history?.series || {};
  // Put the market you tapped on the Map first
  const order = focus && series[focus] ? [focus, ...MARKETS.filter((m) => m !== focus)] : MARKETS;

  return (
    <ScrollView style={c.panel} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.section}>Charts</Text>
      {!history && <Text style={s.body}>Charts appear after the next debrief runs.</Text>}
      {order.map((name) => (
        <MiniChart
          key={name}
          name={name}
          points={series[name]}
          focused={focus === name}
          onPress={() => onFocus(focus === name ? null : name)}
        />
      ))}
      <CurveChart history={rates?.curve_history} />
      <RatesChart banks={rates?.banks} />
    </ScrollView>
  );
}

const c = StyleSheet.create({
  panel: { flex: 1, borderLeftWidth: 1, borderColor: C.rule },
  mini: { backgroundColor: C.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "transparent" },
  focused: { borderColor: C.accent },
  miniHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  name: { color: C.ink, fontSize: 14, fontWeight: "700" },
  value: { color: C.ink, fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  sub: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginTop: 6, marginBottom: 10 },
  title: { color: C.ink, fontSize: 15, fontWeight: "700" },
  explain: { color: C.muted, fontSize: 12.5, lineHeight: 18, marginTop: 2, marginBottom: 8 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  barLabel: { color: C.body, fontSize: 12, fontWeight: "700", width: 34 },
  barTrack: { flex: 1, height: 8, backgroundColor: C.rule, borderRadius: 4, overflow: "hidden" },
  bar: { height: 8, backgroundColor: C.accent, borderRadius: 4 },
  barValue: { color: C.ink, fontSize: 12, width: 48, textAlign: "right", fontVariant: ["tabular-nums"] },
});
