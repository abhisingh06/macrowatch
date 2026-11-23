import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { C, Field, Notes, Rich, Section, SourceLink, niceDate, plain, s } from "./theme";

const STATUS = {
  new: { color: C.accent, bg: C.accentBg },
  developing: { color: C.up, bg: C.upBg },
  fading: { color: C.muted, bg: C.card },
};

// "Show sources" button that opens the list of articles behind a story
function Sources({ items }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return null;
  return (
    <View style={{ marginTop: 4 }}>
      <Pressable onPress={() => setOpen(!open)} hitSlop={8}>
        <Text style={s.link}>{open ? "Hide sources" : `Show sources (${items.length})`}</Text>
      </Pressable>
      {open && items.map((item, i) => <SourceLink key={i} item={item} />)}
    </View>
  );
}

function Storyline({ st, notesOn }) {
  const status = STATUS[st.status] || STATUS.new;
  const sources = [...(st.headlines || []), ...(st.articles || [])];
  return (
    <View style={s.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={s.label}>Running since {niceDate(st.first_seen)}</Text>
        <Text style={[s.pillText, { color: status.color }]}>
          {st.status ? st.status.charAt(0).toUpperCase() + st.status.slice(1) : ""}
        </Text>
      </View>
      <Text style={s.cardTitle}>{plain(st.name)}</Text>
      <Field name="Backstory">{st.backstory}</Field>
      <Field name="Today">{st.today}</Field>
      <Field name="How it moves markets">{st.market_link}</Field>
      <Field name="Next chapter">{st.next_chapter}</Field>
      <Sources items={sources} />
      <Notes lines={st.note} on={notesOn} />
    </View>
  );
}

function RadarStory({ r, notesOn }) {
  return (
    <View style={s.card}>
      <Text style={[s.tag, { color: C.note }]}>Under the radar</Text>
      <Text style={s.cardTitle}>{plain(r.title)}</Text>
      <Rich style={[s.body, { marginBottom: 6 }]} text={r.what} />
      <Field name="Chain">{r.chain}</Field>
      <Field name="Watch for">{r.watch}</Field>
      <Notes lines={r.note} on={notesOn} />
    </View>
  );
}

function DeepDive({ dd, notesOn }) {
  return (
    <View style={s.card}>
      <Text style={s.tag}>Deep dive · {dd.source}</Text>
      <Text style={s.cardTitle}>{plain(dd.title)}</Text>
      <Field name="Why now">{dd.why_now}</Field>
      {(dd.key_points || []).map((p, i) => (
        <Rich key={i} style={[s.body, { marginLeft: 6, marginBottom: 4 }]} prefix="• " text={p} />
      ))}
      <Field name="Market angle">{dd.market_angle}</Field>
      <Field name="Trade idea">{dd.trade_idea}</Field>
      <SourceLink item={{ ...dd, source: "Read the full piece" }} />
      <Notes lines={dd.note} on={notesOn} />
    </View>
  );
}

export default function StoriesScreen({ debrief, notesOn }) {
  const storylines = debrief.storylines || [];
  const radar = debrief.under_the_radar || [];
  const deep = debrief.deep_dive || [];
  const reads = debrief.reads || [];
  return (
    <>

      <Section>Storylines</Section>
      {storylines.length === 0 && <Text style={s.body}>No storylines in this debrief yet.</Text>}
      {storylines.map((st, i) => <Storyline key={i} st={st} notesOn={notesOn} />)}

      {radar.length > 0 && <Section>Under the radar</Section>}
      {radar.map((r, i) => <RadarStory key={i} r={r} notesOn={notesOn} />)}

      {deep.length > 0 && <Section>Deep dives</Section>}
      {deep.map((dd, i) => <DeepDive key={i} dd={dd} notesOn={notesOn} />)}

      {reads.length > 0 && <Section>Worth reading in full</Section>}
      <Sources items={reads} />
    </>
  );
}
