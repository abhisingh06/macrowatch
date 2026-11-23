import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, DATA_URL, Rich, Section, niceDate, plain, s } from "./theme";

const TOPICS = [
  ["stocks", "Stocks"], ["rates", "Rates & bonds"], ["fx", "Currencies"], ["commodities", "Oil & gold"],
  ["central_banks", "Central banks"], ["terms", "Key terms"], ["storylines", "Storylines"], ["map", "Market Map"],
];
const TYPES = [
  ["mc", "Multiple choice", "Pick the right answer"],
  ["updown", "Up or down?", "Predict the move"],
  ["order", "Put it in order", "Build the chain"],
  ["tf", "True or false", "Quick checks"],
];
const TOPIC_NAME = Object.fromEntries(TOPICS);
const TYPE_NAME = Object.fromEntries(TYPES.map(([k, n]) => [k, n]));

// Shuffle a copy of a list
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Older debriefs had simple questions with no type or topic
function normalize(q) {
  return { type: "mc", topic: "general", options: [], items: [], ...q };
}

// ---------- Setup: pick topics, types, length and source ----------
function Setup({ today, week, onStart }) {
  const [topics, setTopics] = useState(TOPICS.map(([k]) => k));
  const [types, setTypes] = useState(TYPES.map(([k]) => k));
  const [count, setCount] = useState(10);
  const [source, setSource] = useState("today");

  const pool = (source === "week" && week ? week : today).filter(
    (q) => (topics.includes(q.topic) || q.topic === "general") && types.includes(q.type),
  );
  const n = Math.min(count, pool.length);

  const toggle = (list, setList, key) =>
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  return (
    <>
      <View style={q.seg}>
        {[["today", "Today"], ["week", "This week"]].map(([k, label]) => (
          <Pressable key={k} style={[q.segItem, source === k && q.segOn]} onPress={() => setSource(k)}>
            <Text style={[q.segText, source === k && q.segTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {source === "week" && !week && <Text style={[s.body, { marginTop: 6 }]}>Loading this week's questions…</Text>}

      <Text style={[s.label, { marginTop: 22, marginBottom: 2 }]}>Topics</Text>
      <View style={q.chips}>
        {TOPICS.map(([k, label]) => {
          const on = topics.includes(k);
          return (
            <Pressable key={k} style={[q.chip, on && q.chipOn]} onPress={() => toggle(topics, setTopics, k)}>
              <Text style={[q.chipText, on && { color: C.accentInk }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[s.label, { marginTop: 22, marginBottom: 10 }]}>Question types</Text>
      <View style={q.list}>
        {TYPES.map(([k, label, hint], i) => (
          <View key={k} style={[q.listRow, i > 0 && q.listDivider]}>
            <View style={{ flex: 1 }}>
              <Text style={q.typeText}>{label}</Text>
              <Text style={q.typeHint}>{hint}</Text>
            </View>
            <Switch
              value={types.includes(k)}
              onValueChange={() => toggle(types, setTypes, k)}
              trackColor={{ false: C.raised, true: C.accent }}
              thumbColor="#ffffff"
            />
          </View>
        ))}
      </View>

      <Text style={[s.label, { marginTop: 22 }]}>How many questions?</Text>
      <View style={q.seg}>
        {[5, 10, 15].map((c) => (
          <Pressable key={c} style={[q.segItem, count === c && q.segOn]} onPress={() => setCount(c)}>
            <Text style={[q.segText, count === c && q.segTextOn]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[q.button, { marginTop: 18 }, n === 0 && { opacity: 0.4 }]}
        disabled={n === 0}
        onPress={() => onStart(shuffle(pool).slice(0, n))}
      >
        <Text style={q.buttonText}>{n === 0 ? "No questions match. Pick more topics or types." : `Start · ${n} questions`}</Text>
      </Pressable>
      {n > 0 && n < count && (
        <Text style={[s.body, { textAlign: "center", marginTop: 8, fontSize: 12, color: C.muted }]}>
          Only {n} questions match your picks{source === "today" ? ". Try \"This week\" for more." : "."}
        </Text>
      )}
    </>
  );
}

// ---------- One question, any type ----------
function Question({ question, onAnswer }) {
  const [picked, setPicked] = useState(null);       // chosen option index
  const [chosen, setChosen] = useState([]);         // tap order for "order" questions
  const shuffledItems = useMemo(() => {
    if (question.type !== "order") return [];
    let a = shuffle(question.items);
    if (a.length > 1 && a.join() === question.items.join()) a = [...a.slice(1), a[0]];
    return a;
  }, [question]);

  const isOrder = question.type === "order";
  const answered = isOrder ? chosen.length === question.items.length : picked !== null;
  const correct = isOrder
    ? answered && chosen.every((item, i) => item === question.items[i])
    : picked === question.answer;

  useEffect(() => { if (answered) onAnswer(correct); }, [answered]);

  return (
    <View>
      <Text style={[s.label, { color: C.accent }]}>
        {TYPE_NAME[question.type] || "Question"}{TOPIC_NAME[question.topic] ? ` · ${TOPIC_NAME[question.topic]}` : ""}
      </Text>
      <Text style={q.question}>{plain(question.q)}</Text>

      {/* Up or down: two big buttons side by side */}
      {question.type === "updown" && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {question.options.map((opt, i) => {
            const right = picked !== null && i === question.answer;
            const wrong = picked === i && i !== question.answer;
            return (
              <Pressable key={i} disabled={picked !== null} onPress={() => setPicked(i)} style={[q.dir, right && q.right, wrong && q.wrong]}>
                <Ionicons
                  name={/^up/i.test(opt) ? "arrow-up" : "arrow-down"} size={28}
                  color={right ? C.up : wrong ? C.down : C.body}
                />
                <Text style={[q.dirText, right && { color: C.up }, wrong && { color: C.down }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Multiple choice and true/false: a list of answers */}
      {(question.type === "mc" || question.type === "tf") && question.options.map((opt, i) => {
        const right = picked !== null && i === question.answer;
        const wrong = picked === i && i !== question.answer;
        return (
          <Pressable key={i} disabled={picked !== null} onPress={() => setPicked(i)} style={[q.option, right && q.right, wrong && q.wrong]}>
            <Text style={[q.optionText, right && { color: C.up }, wrong && { color: C.down }]}>
              {right ? "✓ " : wrong ? "✗ " : ""}{plain(opt)}
            </Text>
          </Pressable>
        );
      })}

      {/* Put it in order: tap the steps from cause to effect */}
      {isOrder && (
        <>
          <Text style={[s.body, { marginBottom: 8 }]}>Tap the steps in order, starting with the cause.</Text>
          {shuffledItems.map((item) => {
            const pos = chosen.indexOf(item);
            const rightSpot = answered && pos === question.items.indexOf(item);
            return (
              <Pressable
                key={item}
                disabled={pos !== -1 || answered}
                onPress={() => setChosen([...chosen, item])}
                style={[q.order, pos !== -1 && { borderColor: C.accent }, answered && (rightSpot ? q.right : q.wrong)]}
              >
                <View style={q.orderNum}><Text style={q.orderNumText}>{pos === -1 ? "" : pos + 1}</Text></View>
                <Text style={q.optionText}>{plain(item)}</Text>
              </Pressable>
            );
          })}
          {chosen.length > 0 && !answered && (
            <Pressable onPress={() => setChosen([])}><Text style={s.link}>Start over</Text></Pressable>
          )}
          {answered && !correct && (
            <Text style={[s.body, { marginTop: 6 }]}>
              <Text style={{ color: C.ink, fontWeight: "700" }}>Right order: </Text>
              {question.items.map(plain).join(" → ")}
            </Text>
          )}
        </>
      )}

      {answered && (
        <>
          <View style={[s.card, { marginTop: 14 }]}>
            <Text style={[q.verdict, { color: correct ? C.up : C.down }]}>{correct ? "Right." : "Not quite."}</Text>
            <Rich text={question.explain} />
          </View>
        </>
      )}
    </View>
  );
}

// ---------- Running the quiz ----------
function Runner({ questions, onDone }) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]);       // true/false per question
  const question = questions[index];
  const answered = results[index] !== undefined;

  function record(ok) {
    const next = [...results];
    next[index] = ok;
    setResults(next);
  }

  return (
    <>
      <Text style={s.label}>Question {index + 1} of {questions.length}</Text>
      <View style={q.progress}>
        <View style={[q.progressFill, { width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }]} />
      </View>
      <Question key={index} question={question} onAnswer={record} />
      {answered && (
        <Pressable
          style={[q.button, q.white]}
          onPress={() => (index + 1 < questions.length ? setIndex(index + 1) : onDone(results))}
        >
          <Text style={[q.buttonText, { color: C.bg }]}>{index + 1 < questions.length ? "Next question" : "See my score"}</Text>
        </Pressable>
      )}
    </>
  );
}

// ---------- Score, broken down by topic ----------
function Results({ questions, results, onAgain, onNew }) {
  const score = results.filter(Boolean).length;
  const byTopic = {};
  questions.forEach((qq, i) => {
    const t = TOPIC_NAME[qq.topic] || "General";
    byTopic[t] = byTopic[t] || [0, 0];
    byTopic[t][1] += 1;
    if (results[i]) byTopic[t][0] += 1;
  });
  return (
    <View style={s.card}>
      <Text style={s.label}>Your score</Text>
      <Text style={q.score}>{score} / {questions.length}</Text>
      {Object.entries(byTopic).map(([t, [r, n]]) => (
        <View key={t} style={q.topicRow}>
          <Text style={s.body}>{t}</Text>
          <Text style={[s.body, { color: r === n ? C.up : r === 0 ? C.down : C.note, fontWeight: "700" }]}>{r} / {n}</Text>
        </View>
      ))}
      <Pressable style={[q.button, { marginTop: 16 }]} onPress={onAgain}><Text style={q.buttonText}>Practice again</Text></Pressable>
      <Pressable style={[q.ghost, { marginTop: 8 }]} onPress={onNew}><Text style={q.ghostText}>Change topics</Text></Pressable>
    </View>
  );
}

// ---------- "Your take" ----------
function YourTake({ prompt }) {
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);
  if (!prompt) return null;
  return (
    <View style={s.card}>
      <Rich style={q.question} text={prompt} />
      <TextInput
        style={q.input}
        multiline
        value={answer}
        onChangeText={(t) => { setAnswer(t); setSaved(false); }}
        placeholder="Your call: the trade, why, and what would prove you wrong."
        placeholderTextColor={C.muted}
      />
      <Pressable style={[q.button, !answer.trim() && { opacity: 0.4 }]} disabled={!answer.trim()} onPress={() => setSaved(true)}>
        <Text style={q.buttonText}>Lock in my call</Text>
      </Pressable>
      {saved && (
        <Text style={[s.body, { marginTop: 10, color: C.note }]}>Locked in. Coach feedback and a score are coming in the next step.</Text>
      )}
    </View>
  );
}

export default function QuizScreen({ debrief }) {
  const today = useMemo(() => (debrief.quiz || []).map(normalize), [debrief.date]);
  const [week, setWeek] = useState(null);
  const [mode, setMode] = useState("setup");       // setup | running | done
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);

  // Questions from the last 10 debriefs, for "This week"
  useEffect(() => {
    fetch(`${DATA_URL}quiz_bank.json?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((bank) => setWeek(Array.isArray(bank) && bank.length ? bank.map(normalize) : today))
      .catch(() => setWeek(today));
  }, [debrief.date]);

  // A new day's debrief sends you back to the setup screen
  useEffect(() => { setMode("setup"); }, [debrief.date]);

  return (
    <>
      <Text style={s.label}>Questions from {niceDate(debrief.date)}</Text>
      {mode === "setup" && (
        <>
          <Section>Build your quiz</Section>
          <Setup today={today} week={week} onStart={(qs) => { setQuestions(qs); setMode("running"); }} />
          <Section>Your take</Section>
          <YourTake key={`take-${debrief.date}`} prompt={debrief.take} />
        </>
      )}
      {mode === "running" && (
        <>
          <Section>Quiz</Section>
          <Runner key={questions.map((x) => x.q).join("|")} questions={questions} onDone={(r) => { setResults(r); setMode("done"); }} />
        </>
      )}
      {mode === "done" && (
        <>
          <Section>Results</Section>
          <Results
            questions={questions}
            results={results}
            onAgain={() => { setQuestions(shuffle(questions)); setMode("running"); }}
            onNew={() => setMode("setup")}
          />
        </>
      )}
    </>
  );
}

const q = StyleSheet.create({
  seg: { flexDirection: "row", backgroundColor: C.card, borderRadius: 12, padding: 3, marginTop: 8 },
  segItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10 },
  segOn: { backgroundColor: C.raised },
  segText: { color: C.muted, fontWeight: "700", fontSize: 14 },
  segTextOn: { color: C.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  chipOn: { backgroundColor: C.accent },
  chipText: { color: C.body, fontSize: 14, fontWeight: "600" },
  list: { backgroundColor: C.card, borderRadius: 16, overflow: "hidden" },
  listRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  listDivider: { borderTopWidth: 1, borderColor: C.rule },
  typeText: { color: C.ink, fontSize: 15, fontWeight: "600" },
  typeHint: { color: C.muted, fontSize: 12.5, marginTop: 1 },
  progress: { height: 4, backgroundColor: C.rule, borderRadius: 4, marginTop: 8, marginBottom: 18, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: C.accent },
  question: { color: C.ink, fontSize: 22, fontWeight: "700", lineHeight: 28, letterSpacing: -0.3, marginTop: 8, marginBottom: 18 },
  option: { borderRadius: 14, padding: 14, marginBottom: 8, backgroundColor: C.card },
  optionText: { color: C.ink, fontSize: 15, lineHeight: 21, flex: 1 },
  dir: { flex: 1, borderRadius: 18, height: 108, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.card },
  dirText: { color: C.ink, fontSize: 16, fontWeight: "700" },
  order: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 13, marginBottom: 8, backgroundColor: C.card, borderWidth: 1, borderColor: "transparent" },
  orderNum: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.accent, alignItems: "center", justifyContent: "center" },
  orderNumText: { color: C.accent, fontWeight: "800", fontSize: 13 },
  right: { backgroundColor: C.upBg, borderWidth: 2, borderColor: C.up },
  wrong: { backgroundColor: C.downBg, borderWidth: 2, borderColor: C.down },
  verdict: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  score: { color: C.accent, fontSize: 44, fontWeight: "900", marginVertical: 6 },
  topicRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.rule },
  button: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  white: { backgroundColor: C.ink, marginTop: 16 },
  buttonText: { color: C.accentInk, fontWeight: "700", fontSize: 15.5 },
  ghost: { backgroundColor: C.card, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  ghostText: { color: C.ink, fontWeight: "600", fontSize: 15 },
  input: {
    borderRadius: 12, backgroundColor: C.bg, color: C.ink, borderWidth: 1, borderColor: C.rule,
    minHeight: 110, padding: 12, fontSize: 15, lineHeight: 21, textAlignVertical: "top", marginBottom: 10,
  },
});
