import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { C, Section, s } from "./theme";

// One question at a time, with a progress bar and a score at the end
function Quiz({ questions }) {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState([]);          // the answer chosen for each question

  if (questions.length === 0) {
    return <Text style={s.body}>No quiz in this debrief yet.</Text>;
  }

  const done = index >= questions.length;
  const score = picks.filter((p, i) => p === questions[i].answer).length;

  if (done) {
    return (
      <View style={s.card}>
        <Text style={s.label}>Your score</Text>
        <Text style={q.score}>{score} / {questions.length}</Text>
        <Text style={s.body}>
          {score === questions.length
            ? "Perfect. You've got today's market down."
            : "Go back to the Debrief and Stories tabs for anything you missed."}
        </Text>
        <Pressable style={[q.button, { marginTop: 14 }]} onPress={() => { setIndex(0); setPicks([]); }}>
          <Text style={q.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const question = questions[index];
  const picked = picks[index];
  const answered = picked !== undefined;

  function choose(i) {
    if (answered) return;                           // one try per question
    const next = [...picks];
    next[index] = i;
    setPicks(next);
  }

  return (
    <>
      {/* Progress bar: green = right, red = wrong, grey = not answered yet */}
      <View style={q.progress}>
        {questions.map((qq, i) => {
          const p = picks[i];
          const color = p === undefined ? C.rule : p === qq.answer ? C.up : C.down;
          return <View key={i} style={[q.step, { backgroundColor: color }]} />;
        })}
      </View>
      <Text style={[s.label, { marginBottom: 8 }]}>Question {index + 1} of {questions.length}</Text>

      <View style={s.card}>
        <Text style={q.question}>{question.q}</Text>
        {question.options.map((opt, i) => {
          const isRight = answered && i === question.answer;
          const isWrong = answered && i === picked && i !== question.answer;
          return (
            <Pressable
              key={i}
              onPress={() => choose(i)}
              style={[q.option, isRight && q.right, isWrong && q.wrong]}
            >
              <Text style={[q.optionText, isRight && { color: C.up }, isWrong && { color: C.down }]}>
                {isRight ? "✓ " : isWrong ? "✗ " : ""}{opt}
              </Text>
            </Pressable>
          );
        })}

        {answered && (
          <>
            <Text style={[q.verdict, { color: picked === question.answer ? C.up : C.down }]}>
              {picked === question.answer ? "Right." : "Not quite."}
            </Text>
            <Text style={s.body}>{question.explain}</Text>
            <Pressable style={[q.button, { marginTop: 14 }]} onPress={() => setIndex(index + 1)}>
              <Text style={q.buttonText}>{index + 1 < questions.length ? "Next question" : "See my score"}</Text>
            </Pressable>
          </>
        )}
      </View>
    </>
  );
}

// "Your take": write your own trade call on the day's biggest theme
function YourTake({ prompt }) {
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);
  if (!prompt) return null;
  return (
    <View style={s.card}>
      <Text style={q.question}>{prompt}</Text>
      <TextInput
        style={q.input}
        multiline
        value={answer}
        onChangeText={(t) => { setAnswer(t); setSaved(false); }}
        placeholder="Your call: the trade, why, and what would prove you wrong."
        placeholderTextColor={C.muted}
      />
      <Pressable
        style={[q.button, !answer.trim() && { opacity: 0.4 }]}
        disabled={!answer.trim()}
        onPress={() => setSaved(true)}
      >
        <Text style={q.buttonText}>Lock in my call</Text>
      </Pressable>
      {saved && (
        <Text style={[s.body, { marginTop: 10, color: C.note }]}>
          Locked in. Coach feedback and a score are coming in the next step.
        </Text>
      )}
    </View>
  );
}

export default function QuizScreen({ debrief }) {
  return (
    <>
      <Text style={s.label}>Check yourself · {debrief.date}</Text>
      <Section>Quiz</Section>
      {/* key resets the quiz whenever a new day's debrief arrives */}
      <Quiz key={debrief.date} questions={debrief.quiz || []} />
      <Section>Your take</Section>
      <YourTake key={`take-${debrief.date}`} prompt={debrief.take} />
    </>
  );
}

const q = StyleSheet.create({
  progress: { flexDirection: "row", gap: 6, marginTop: 6, marginBottom: 10 },
  step: { flex: 1, height: 6, borderRadius: 6 },
  question: { color: C.ink, fontSize: 16, fontWeight: "700", lineHeight: 22, marginBottom: 12 },
  option: { borderWidth: 1, borderColor: C.rule, borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: C.bg },
  optionText: { color: C.ink, fontSize: 14, lineHeight: 20 },
  right: { borderColor: C.up, backgroundColor: C.upBg },
  wrong: { borderColor: C.down, backgroundColor: C.downBg },
  verdict: { fontSize: 15, fontWeight: "800", marginTop: 6, marginBottom: 4 },
  score: { color: C.accent, fontSize: 44, fontWeight: "900", marginVertical: 6 },
  button: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: C.bg, fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: C.rule, borderRadius: 10, backgroundColor: C.bg, color: C.ink,
    minHeight: 110, padding: 12, fontSize: 14, lineHeight: 20, textAlignVertical: "top", marginBottom: 10,
  },
});
