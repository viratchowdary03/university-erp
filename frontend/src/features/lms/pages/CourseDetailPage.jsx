import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, FileText, HelpCircle, Link2, Plus, Trash2, Video } from "lucide-react";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import Tabs from "../../../components/common/Tabs";
import Modal from "../../../components/common/Modal";
import EmptyState from "../../../components/common/EmptyState";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { formatDate, formatDateTime, safeHref, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";

const KIND_ICON = { Link: Link2, Video, Notes: FileText };

export default function CourseDetailPage() {
  const { code } = useParams();
  const [tab, setTab] = useState("materials");
  const query = useData(["lms", "course", code], `/lms/courses/${code}`);
  return (
    <>
      <Link to="/lms" className="mb-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"><ArrowLeft size={15} /> All courses</Link>
      <QueryState query={query}>
        {(d) => (
          <>
            <div className="mb-5">
              <p className="font-mono text-xs text-slate-400">{d.course.code}</p>
              <h1 className="text-2xl font-semibold text-slate-900">{d.course.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{d.course.facultyName} - {d.course.credits} credits - {d.course.type}</p>
              {d.course.description && <p className="mt-2 max-w-3xl text-sm text-slate-600">{d.course.description}</p>}
            </div>
            <Tabs value={tab} onChange={setTab} tabs={[{ id: "materials", label: `Materials (${d.materials.length})` }, { id: "assignments", label: `Assignments (${d.assignments.length})` }, { id: "quizzes", label: `Quizzes (${d.quizzes.length})` }]} />
            {tab === "materials" && <Materials d={d} />}
            {tab === "assignments" && <Assignments d={d} />}
            {tab === "quizzes" && <Quizzes d={d} />}
          </>
        )}
      </QueryState>
    </>
  );
}

function useActions() {
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const run = (req, ok) => send.mutateAsync(req).then(() => ok && toast.success(ok)).catch((e) => toast.error(getErrorMessage(e)));
  const del = async (title, req, ok) => { if (await confirm({ title, tone: "danger" })) run(req, ok); };
  return { send, toast, run, del };
}

function Materials({ d }) {
  const { send, toast, del } = useActions();
  const [open, setOpen] = useState(false);
  return (
    <>
      {d.canTeach && <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus size={16} /> Add material</Button></div>}
      <Card>
        {d.materials.length === 0 ? <EmptyState icon={FileText} title="No study material yet" /> : (
          <ul className="divide-y">
            {d.materials.map((m) => {
              const Icon = KIND_ICON[m.kind] || FileText;
              const href = safeHref(m.url);
              return (
                <li key={m.id} className="flex items-start gap-3 py-3">
                  <Icon size={18} className="mt-0.5 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    {href ? <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-brand-700 hover:underline">{m.title}</a> : <p className="font-medium text-slate-900">{m.title}</p>}
                    {m.description && <p className="whitespace-pre-line text-sm text-slate-600">{m.description}</p>}
                    <p className="text-xs text-slate-400">{m.unit ? `Unit ${m.unit} - ` : ""}{m.postedByName} - {formatDate(m.createdAt)}</p>
                  </div>
                  {d.canTeach && <button type="button" aria-label={`Remove ${m.title}`} onClick={() => del("Remove this material?", { method: "delete", url: `/lms/materials/${m.id}` }, "Material removed")} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Add study material"
        initial={{ kind: "Link", unit: 1 }}
        fields={[
          { name: "title", label: "Title", required: true, span: 2 },
          { name: "kind", label: "Type", type: "select", required: true, options: ["Link", "Video", "Notes"].map((k) => ({ value: k, label: k })) },
          { name: "unit", label: "Unit number", type: "number", min: 0, max: 30 },
          { name: "url", label: "Web address", type: "url", placeholder: "https://", span: 2, hint: "Share files as a link (Drive, YouTube...). Leave empty for plain notes." },
          { name: "description", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (v) => { await send.mutateAsync({ method: "post", url: `/lms/courses/${d.course.code}/materials`, body: v }); toast.success("Material added"); setOpen(false); }}
      />
    </>
  );
}

function Assignments({ d }) {
  const { send, toast, del } = useActions();
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [grading, setGrading] = useState(null);
  return (
    <>
      {d.canTeach && <div className="mb-4 flex justify-end"><Button onClick={() => setAdding(true)}><Plus size={16} /> New assignment</Button></div>}
      <Card>
        {d.assignments.length === 0 ? <EmptyState icon={ClipboardList} title="No assignments" /> : (
          <ul className="divide-y">
            {d.assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{a.title}</p>
                  {a.description && <p className="text-sm text-slate-600">{a.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">Due {formatDateTime(a.dueDate)} - {a.marks} marks</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {d.canTeach ? (
                    <>
                      <Button variant="secondary" className="px-3 py-1.5" onClick={() => setGrading(a)}>{a.submissions} submitted</Button>
                      <button type="button" aria-label={`Delete ${a.title}`} onClick={() => del("Delete this assignment?", { method: "delete", url: `/lms/assignments/${a.id}` }, "Assignment deleted")} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button>
                    </>
                  ) : a.mine ? (
                    <div className="text-right text-sm">
                      <Badge tone={a.mine.marks !== null && a.mine.marks !== undefined ? "green" : "brand"}>{a.mine.marks !== null && a.mine.marks !== undefined ? `${a.mine.marks} / ${a.marks}` : "Submitted"}</Badge>
                      {a.mine.late && <Badge tone="amber" className="ml-1">Late</Badge>}
                      {a.mine.feedback && <p className="mt-1 max-w-xs text-xs text-slate-500">{a.mine.feedback}</p>}
                      {(a.mine.marks === null || a.mine.marks === undefined) && <button type="button" onClick={() => setSubmitting(a)} className="mt-1 block text-xs font-medium text-brand-600 hover:underline">Edit submission</button>}
                    </div>
                  ) : <Button className="px-3 py-1.5" onClick={() => setSubmitting(a)}>{a.overdue ? "Submit late" : "Submit"}</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <FormModal
        open={adding}
        onClose={() => setAdding(false)}
        title="New assignment"
        fields={[
          { name: "title", label: "Title", required: true, span: 2 },
          { name: "description", label: "Instructions", type: "textarea" },
          { name: "dueDate", label: "Due date", type: "date", required: true },
          { name: "marks", label: "Marks", type: "number", required: true, min: 1 },
        ]}
        onSubmit={async (v) => { await send.mutateAsync({ method: "post", url: `/lms/courses/${d.course.code}/assignments`, body: v }); toast.success("Assignment posted"); setAdding(false); }}
      />
      <FormModal
        open={Boolean(submitting)}
        onClose={() => setSubmitting(null)}
        title={`Submit: ${submitting?.title || ""}`}
        initial={{ text: submitting?.mine?.text || "", link: submitting?.mine?.link || "" }}
        submitLabel="Submit work"
        fields={[
          { name: "text", label: "Your answer", type: "textarea", rows: 6 },
          { name: "link", label: "Link to your file (optional)", type: "url", placeholder: "https://", span: 2 },
        ]}
        onSubmit={async (v) => { await send.mutateAsync({ method: "post", url: `/lms/assignments/${submitting.id}/submit`, body: v }); toast.success("Work submitted"); setSubmitting(null); }}
      />
      {grading && <Submissions assignment={grading} onClose={() => setGrading(null)} />}
    </>
  );
}

function Submissions({ assignment, onClose }) {
  const { send, toast } = useActions();
  const [grade, setGrade] = useState(null);
  const query = useData(["lms", "submissions", assignment.id], `/lms/assignments/${assignment.id}/submissions`);
  return (
    <Modal open onClose={onClose} title={`Submissions: ${assignment.title}`} size="lg">
      <QueryState query={query} table>
        {({ rows }) => (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.studentId} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.name} <span className="text-xs font-normal text-slate-400">{r.enrollmentNo}</span></p>
                  {r.submission ? (
                    <>
                      {r.submission.text && <p className="mt-1 whitespace-pre-line text-slate-600">{r.submission.text}</p>}
                      {safeHref(r.submission.link) && <a href={safeHref(r.submission.link)} target="_blank" rel="noreferrer noopener" className="text-brand-600 hover:underline">Open the linked file</a>}
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(r.submission.updatedAt)}{r.submission.late ? " - late" : ""}</p>
                    </>
                  ) : <p className="text-xs text-slate-400">Not submitted</p>}
                </div>
                {r.submission && <Button variant="secondary" className="px-3 py-1.5" onClick={() => setGrade(r.submission)}>{r.submission.marks !== null && r.submission.marks !== undefined ? `${r.submission.marks} / ${assignment.marks}` : "Grade"}</Button>}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <FormModal
        open={Boolean(grade)}
        onClose={() => setGrade(null)}
        title="Grade submission"
        initial={{ marks: grade?.marks ?? "", feedback: grade?.feedback || "" }}
        fields={[
          { name: "marks", label: `Marks (out of ${assignment.marks})`, type: "number", required: true, min: 0, max: assignment.marks, step: "0.5" },
          { name: "feedback", label: "Feedback", type: "textarea" },
        ]}
        onSubmit={async (v) => { await send.mutateAsync({ method: "patch", url: `/lms/submissions/${grade.id}/grade`, body: v }); toast.success("Graded"); setGrade(null); }}
      />
    </Modal>
  );
}

function Quizzes({ d }) {
  const navigate = useNavigate();
  const { send, toast, del } = useActions();
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState(null);
  return (
    <>
      {d.canTeach && <div className="mb-4 flex justify-end"><Button onClick={() => setAdding(true)}><Plus size={16} /> New quiz</Button></div>}
      <Card>
        {d.quizzes.length === 0 ? <EmptyState icon={HelpCircle} title="No quizzes" /> : (
          <ul className="divide-y">
            {d.quizzes.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div><p className="font-medium text-slate-900">{q.title}</p><p className="text-xs text-slate-400">{q.questionCount} questions - {q.durationMin} min</p></div>
                <div className="flex items-center gap-2">
                  {d.canTeach ? (
                    <>
                      <Button variant="secondary" className="px-3 py-1.5" onClick={() => setResults(q)}>{q.attempts} attempt(s)</Button>
                      <button type="button" aria-label={`Delete ${q.title}`} onClick={() => del("Delete this quiz?", { method: "delete", url: `/lms/quizzes/${q.id}` }, "Quiz deleted")} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button>
                    </>
                  ) : q.mine ? <Badge tone="green">Score {q.mine.score} / {q.mine.total}</Badge> : <Button className="px-3 py-1.5" onClick={() => navigate(`/lms/quiz/${q.id}`)}>Start</Button>}
                  {!d.canTeach && q.mine && <Button variant="secondary" className="px-3 py-1.5" onClick={() => navigate(`/lms/quiz/${q.id}`)}>Review</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <QuizBuilder open={adding} onClose={() => setAdding(false)} onSubmit={async (v) => { await send.mutateAsync({ method: "post", url: `/lms/courses/${d.course.code}/quizzes`, body: v }); toast.success("Quiz created"); setAdding(false); }} />
      {results && <Attempts quiz={results} onClose={() => setResults(null)} />}
    </>
  );
}

function Attempts({ quiz, onClose }) {
  const query = useData(["lms", "attempts", quiz.id], `/lms/quizzes/${quiz.id}/attempts`);
  return (
    <Modal open onClose={onClose} title={`Results: ${quiz.title}`}>
      <QueryState query={query} table>
        {({ attempts }) => attempts.length === 0 ? <EmptyState title="Nobody has attempted this quiz" /> : (
          <ul className="divide-y text-sm">{attempts.map((a) => <li key={a.id} className="flex justify-between py-2"><span>{a.name} <span className="text-xs text-slate-400">{a.enrollmentNo}</span></span><b>{a.score} / {a.total}</b></li>)}</ul>
        )}
      </QueryState>
    </Modal>
  );
}

// Teachers type each question with its options and pick the right one
function QuizBuilder({ open, onClose, onSubmit }) {
  const blank = () => ({ text: "", options: ["", "", "", ""], correct: 0 });
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(10);
  const [questions, setQuestions] = useState([blank()]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const patch = (i, p) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...p } : q)));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const empty = questions.findIndex((q) => !q.options[q.correct]?.trim());
    if (empty >= 0) return setError(`Question ${empty + 1}: the ticked answer is empty. Tick an option that has text.`);
    setBusy(true);
    try {
      await onSubmit({ title, durationMin: Number(duration), questions: questions.map((q) => ({ ...q, options: q.options.filter((o) => o.trim()), correct: q.options.slice(0, q.correct).filter((o) => o.trim()).length })) });
      setTitle(""); setQuestions([blank()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New quiz" size="lg">
      <form onSubmit={submit} className="space-y-5">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Title *</span><input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" /></label>
          <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Minutes *</span><input required type="number" min="1" max="300" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" /></label>
        </div>
        {questions.map((q, i) => (
          <fieldset key={i} className="rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold text-slate-700">Question {i + 1}</legend>
            <input required aria-label={`Question ${i + 1}`} placeholder="Type the question" value={q.text} onChange={(e) => patch(i, { text: e.target.value })} className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            {q.options.map((o, k) => (
              <label key={k} className="mb-2 flex items-center gap-2">
                <input type="radio" name={`correct-${i}`} checked={q.correct === k} onChange={() => patch(i, { correct: k })} aria-label={`Option ${k + 1} is correct`} />
                <input required={k < 2} placeholder={`Option ${k + 1}${k < 2 ? "" : " (optional)"}`} value={o} onChange={(e) => patch(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
              </label>
            ))}
            <p className="text-xs text-slate-400">Tick the circle of the right answer.</p>
            {questions.length > 1 && <button type="button" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} className="mt-1 text-xs font-medium text-red-600 hover:underline">Remove question</button>}
          </fieldset>
        ))}
        <button type="button" onClick={() => setQuestions((qs) => [...qs, blank()])} className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"><Plus size={14} /> Add a question</button>
        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Create quiz</Button></div>
      </form>
    </Modal>
  );
}
