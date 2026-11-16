import { Text, View } from "react-native";
import { C, Field, Notes, Section, SourceLink, s } from "./theme";

const STATUS = {
  new: { color: C.accent, bg: C.accentBg },
  developing: { color: C.up, bg: C.upBg },
  fading: { color: C.muted, bg: C.rule },
};

function Storyline({ st, notesOn }) {
  const status = STATUS[st.status] || STATUS.new;
  const sources = [...(st.headlines || []), ...(st.articles || [])];
  return (
    <View style={s.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={s.tag}>Running since {st.first_seen}</Text>
        <View style={[s.pill, { backgroundColor: status.bg }]}>
          <Text style={[s.pillText, { color: status.color }]}>{st.status}</Text>
        </View>
      </View>
      <Text style={s.cardTitle}>{st.name}</Text>
      <Field name="Backstory">{st.backstory}</Field>
      <Field name="Today">{st.today}</Field>
      <Field name="How it moves markets">{st.market_link}</Field>
      <Field name="Next chapter">{st.next_chapter}</Field>
      {sources.map((item, i) => <SourceLink key={i} item={item} />)}
      <Notes lines={st.note} on={notesOn} />
    </View>
  );
}

function RadarStory({ r, notesOn }) {
  return (
    <View style={s.card}>
      <Text style={[s.tag, { color: C.note }]}>Under the radar</Text>
      <Text style={s.cardTitle}>{r.title}</Text>
      <Text style={[s.body, { marginBottom: 6 }]}>{r.what}</Text>
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
      <Text style={s.cardTitle}>{dd.title}</Text>
      <Field name="Why now">{dd.why_now}</Field>
      {(dd.key_points || []).map((p, i) => (
        <Text key={i} style={[s.body, { marginLeft: 6, marginBottom: 4 }]}>• {p}</Text>
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
      <Text style={s.label}>The stories behind the moves</Text>

      <Section>Storylines</Section>
      {storylines.length === 0 && <Text style={s.body}>No storylines in this debrief yet.</Text>}
      {storylines.map((st, i) => <Storyline key={i} st={st} notesOn={notesOn} />)}

      {radar.length > 0 && <Section>Under the radar</Section>}
      {radar.map((r, i) => <RadarStory key={i} r={r} notesOn={notesOn} />)}

      {deep.length > 0 && <Section>Deep dives</Section>}
      {deep.map((dd, i) => <DeepDive key={i} dd={dd} notesOn={notesOn} />)}

      {reads.length > 0 && <Section>Worth reading in full</Section>}
      {reads.map((r, i) => <SourceLink key={i} item={r} />)}
    </>
  );
}
