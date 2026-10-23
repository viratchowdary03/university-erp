import { useState } from "react";
import { useSelector } from "react-redux";
import { Pencil, Plus, Trash2, RotateCcw, RefreshCw, BookOpen, AlertTriangle, Library as LibraryIcon } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import StatCard from "../../../components/common/StatCard";
import Tabs from "../../../components/common/Tabs";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";
import DataTable from "../../../components/common/DataTable";
import FilterSelect from "../../../components/common/FilterSelect";
import FormModal from "../../../components/common/FormModal";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { PERM, canManage } from "../../../config/permissions";
import { formatDate, formatMoney, getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";
import { useConfirm } from "../../../hooks/useConfirm";
import { ROLES } from "../../../config/roles";

export default function LibraryPage() {
  const user = useSelector((s) => s.auth.user);
  const staff = canManage(user.role, PERM.LIBRARY);
  const student = user.role === ROLES.STUDENT;
  const [tab, setTab] = useState(student ? "mine" : "issues");
  const tabs = [
    ...(student ? [{ id: "mine", label: "My books" }] : []),
    ...(staff ? [{ id: "issues", label: "Issue & return" }] : []),
    { id: "books", label: "Catalogue" },
  ];
  return (
    <>
      <PageHeader title="Library" subtitle={staff ? "Manage the catalogue, issue books and take them back" : "Search the catalogue and see your books"} />
      <Tabs value={tab} onChange={setTab} tabs={tabs} />
      {tab === "mine" && <MyBooks />}
      {tab === "issues" && <Issues />}
      {tab === "books" && <Catalogue staff={staff} />}
    </>
  );
}

function MyBooks() {
  const query = useData(["library", "me"], "/library/me");
  return (
    <QueryState query={query} table>
      {(rows) => {
        const out = rows.filter((r) => r.status === "issued");
        return (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <StatCard label="Books with you" value={out.length} icon={BookOpen} />
              <StatCard label="Overdue" value={out.filter((r) => r.overdueDays > 0).length} icon={AlertTriangle} tone={out.some((r) => r.overdueDays > 0) ? "red" : "green"} />
              <StatCard label="Fine to pay" value={formatMoney(rows.filter((r) => r.status === "issued").reduce((n, r) => n + r.fineNow, 0) || 0)} hint="Pay at the library counter" tone="amber" />
            </div>
            <Card>
              <DataTable
                rowKey={(r) => r.id}
                rows={rows}
                columns={[
                  { key: "t", header: "Book", render: (r) => <><p className="font-medium">{r.title}</p><p className="text-xs text-slate-400">{r.author}</p></> },
                  { key: "i", header: "Issued", render: (r) => formatDate(r.issuedAt) },
                  { key: "d", header: "Due", render: (r) => formatDate(r.dueDate) },
                  { key: "s", header: "Status", render: (r) => r.status === "returned" ? <Badge tone="slate">Returned {formatDate(r.returnedAt)}</Badge> : r.overdueDays > 0 ? <Badge tone="red">{r.overdueDays} day(s) overdue</Badge> : <Badge tone="green">With you</Badge> },
                  { key: "f", header: "Fine", render: (r) => (r.fineNow ? formatMoney(r.fineNow) : "-") },
                ]}
                emptyTitle="You have not borrowed any books"
              />
            </Card>
          </>
        );
      }}
    </QueryState>
  );
}

function Catalogue({ staff }) {
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState(null);
  const query = useData(["library", "books"], "/library/books");

  const remove = async (b) => {
    if (!(await confirm({ title: "Delete this book?", message: b.title, tone: "danger" }))) return;
    send.mutateAsync({ method: "delete", url: `/library/books/${b.id}` }).then(() => toast.success("Book deleted")).catch((e) => toast.error(getErrorMessage(e)));
  };

  return (
    <>
      {staff && <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")}><Plus size={16} /> Add book</Button></div>}
      <QueryState query={query} table>
        {({ books, categories }) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={books.filter((b) => !category || b.category === category)}
              getSearchText={(b) => `${b.title} ${b.author} ${b.isbn || ""} ${b.category}`}
              searchPlaceholder="Search title, author or ISBN"
              filters={<FilterSelect label="Category" value={category} onChange={setCategory} options={[{ value: "", label: "All" }, ...categories.map((c) => ({ value: c, label: c }))]} />}
              columns={[
                { key: "t", header: "Book", render: (b) => <><p className="font-medium">{b.title}</p><p className="text-xs text-slate-400">{b.author}</p></> },
                { key: "c", header: "Category", render: (b) => b.category },
                { key: "s", header: "Shelf", render: (b) => b.shelf || "-" },
                { key: "a", header: "Available", render: (b) => <Badge tone={b.available ? "green" : "red"}>{b.available} of {b.copies}</Badge> },
                ...(staff ? [{ key: "x", header: "", render: (b) => <div className="flex justify-end gap-1"><button type="button" aria-label="Edit book" onClick={() => setEditing(b)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"><Pencil size={16} /></button><button type="button" aria-label="Delete book" onClick={() => remove(b)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"><Trash2 size={16} /></button></div> }] : []),
              ]}
              emptyTitle="No books found"
            />
          </Card>
        )}
      </QueryState>
      <FormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add a book" : "Edit book"}
        initial={editing && editing !== "new" ? editing : { copies: 1 }}
        fields={[
          { name: "title", label: "Title", required: true, span: 2 },
          { name: "author", label: "Author", required: true },
          { name: "category", label: "Category", required: true, placeholder: "Computer Science" },
          { name: "isbn", label: "ISBN" },
          { name: "publisher", label: "Publisher" },
          { name: "year", label: "Year", type: "number" },
          { name: "shelf", label: "Shelf" },
          { name: "copies", label: "Copies", type: "number", required: true, min: 1 },
        ]}
        onSubmit={async (v) => {
          if (editing === "new") await send.mutateAsync({ method: "post", url: "/library/books", body: v });
          else await send.mutateAsync({ method: "put", url: `/library/books/${editing.id}`, body: v });
          toast.success("Book saved");
          setEditing(null);
        }}
      />
    </>
  );
}

function Issues() {
  const toast = useToast();
  const confirm = useConfirm();
  const send = useSend();
  const [issuing, setIssuing] = useState(false);
  const [filter, setFilter] = useState("issued");
  const issues = useData(["library", "issues"], "/library/issues");
  const catalogue = useData(["library", "books"], "/library/books");
  const summary = useData(["library", "summary"], "/library/summary");

  const act = (url, ok) => send.mutateAsync({ method: "post", url }).then(() => toast.success(ok)).catch((e) => toast.error(getErrorMessage(e)));
  const giveBack = async (i) => {
    const fine = i.fineNow ? ` A fine of ${formatMoney(i.fineNow)} applies.` : "";
    if (await confirm({ title: `Take back "${i.title}"?`, message: `From ${i.studentName}.${fine}` })) act(`/library/issues/${i.id}/return`, i.fineNow ? `Returned. Collect a fine of ${formatMoney(i.fineNow)}` : "Book returned");
  };

  return (
    <>
      <QueryState query={summary}>
        {(s) => (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Titles" value={s.titles} icon={LibraryIcon} />
            <StatCard label="Copies" value={s.copies} />
            <StatCard label="Issued now" value={s.issued} icon={BookOpen} tone="amber" />
            <StatCard label="Overdue" value={s.overdue} icon={AlertTriangle} tone={s.overdue ? "red" : "green"} />
          </div>
        )}
      </QueryState>
      <div className="mb-4 flex justify-end"><Button onClick={() => setIssuing(true)}><Plus size={16} /> Issue a book</Button></div>
      <QueryState query={issues} table>
        {(rows) => (
          <Card>
            <DataTable
              rowKey={(r) => r.id}
              rows={rows.filter((r) => !filter || (filter === "overdue" ? r.status === "issued" && r.overdueDays > 0 : r.status === filter))}
              getSearchText={(r) => `${r.title} ${r.studentName} ${r.enrollmentNo}`}
              searchPlaceholder="Search book or student"
              filters={<FilterSelect label="Show" value={filter} onChange={setFilter} options={[{ value: "issued", label: "Issued" }, { value: "overdue", label: "Overdue" }, { value: "returned", label: "Returned" }, { value: "", label: "All" }]} />}
              columns={[
                { key: "t", header: "Book", render: (r) => <><p className="font-medium">{r.title}</p><p className="text-xs text-slate-400">{r.author}</p></> },
                { key: "s", header: "Student", render: (r) => <>{r.studentName}<p className="text-xs text-slate-400">{r.enrollmentNo}</p></> },
                { key: "d", header: "Due", render: (r) => formatDate(r.dueDate) },
                { key: "st", header: "Status", render: (r) => r.status === "returned" ? <Badge>Returned</Badge> : r.overdueDays > 0 ? <Badge tone="red">{r.overdueDays}d late - {formatMoney(r.fineNow)}</Badge> : <Badge tone="green">Issued</Badge> },
                { key: "a", header: "", render: (r) => r.status === "issued" && (
                  <div className="flex justify-end gap-1">
                    <Button variant="secondary" className="px-2.5 py-1.5" onClick={() => act(`/library/issues/${r.id}/renew`, "Renewed")}><RefreshCw size={14} /> Renew</Button>
                    <Button className="px-2.5 py-1.5" onClick={() => giveBack(r)}><RotateCcw size={14} /> Return</Button>
                  </div>
                ) },
              ]}
              emptyTitle="Nothing here"
            />
          </Card>
        )}
      </QueryState>
      <FormModal
        open={issuing}
        onClose={() => setIssuing(false)}
        title="Issue a book"
        submitLabel="Issue"
        fields={[
          { name: "bookId", label: "Book", type: "select", required: true, span: 2, options: (catalogue.data?.books ?? []).filter((b) => b.available > 0).map((b) => ({ value: b.id, label: `${b.title} (${b.available} available)` })) },
          { name: "member", label: "Student enrollment number or email", required: true, span: 2 },
        ]}
        onSubmit={async (v) => {
          await send.mutateAsync({ method: "post", url: "/library/issues", body: v });
          toast.success("Book issued");
          setIssuing(false);
        }}
      />
    </>
  );
}
