import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";

export default function QuizPage() {
  const { id } = useParams();
  const query = useData(["lms", "quiz", id], `/lms/quizzes/${id}`, { staleTime: 0 });
  return (
    <QueryState query={query}>
      {(quiz) => (
        <>
          <Link to={`/lms/${quiz.courseCode}`} className="mb-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"><ArrowLeft size={15} /> Back to the course</Link>
          <h1 className="mb-1 text-2xl font-semibold text-slate-900">{quiz.title}</h1>
          <p className="mb-5 text-sm text-slate-500">{quiz.questions.length} questions - {quiz.durationMin} minutes - one attempt only</p>
          {quiz.attempt ? <Review quiz={quiz} /> : <Attempt quiz={quiz} />}
        </>
      )}
    </QueryState>
  );
}

function Attempt({ quiz }) {
  const toast = useToast();
  const send = useSend();
  const [answers, setAnswers] = useState(() => quiz.questions.map(() => -1));
  const unanswered = answers.filter((a) => a < 0).length;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await send.mutateAsync({ method: "post", url: `/lms/quizzes/${quiz.id}/attempt`, body: { answers } });
      toast.success("Quiz submitted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {quiz.questions.map((q, i) => (
        <Card key={i}>
          <fieldset>
            <legend className="mb-3 font-medium text-slate-900">{i + 1}. {q.text}</legend>
            <div className="space-y-2">
              {q.options.map((o, k) => (
                <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${answers[i] === k ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <input type="radio" name={`q${i}`} checked={answers[i] === k} onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? k : x)))} />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>
      ))}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{unanswered ? `${unanswered} question(s) not answered` : "All answered"}</p>
        <Button type="submit" loading={send.isPending}>Submit quiz</Button>
      </div>
    </form>
  );
}

function Review({ quiz }) {
  const { attempt } = quiz;
  return (
    <>
      <Card className="mb-5"><p className="text-lg font-semibold text-slate-900">Your score: {attempt.score} / {attempt.total}</p></Card>
      <div className="space-y-4">
        {quiz.questions.map((q, i) => (
          <Card key={i}>
            <p className="mb-3 font-medium text-slate-900">{i + 1}. {q.text}</p>
            <ul className="space-y-2">
              {q.options.map((o, k) => {
                const right = k === q.correct;
                const mine = attempt.answers[i] === k;
                return (
                  <li key={k} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${right ? "border-emerald-300 bg-emerald-50" : mine ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
                    {right ? <CheckCircle2 size={16} className="text-emerald-600" /> : mine ? <XCircle size={16} className="text-red-600" /> : <span className="w-4" />}
                    {o}{mine && <span className="ml-auto text-xs text-slate-500">Your answer</span>}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
