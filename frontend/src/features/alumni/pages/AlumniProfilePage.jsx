import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Briefcase, MapPin, GraduationCap, Handshake } from "lucide-react";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import QueryState from "../../../components/common/PageLoader";
import { useData } from "../../../api/resource";
import { safeHref } from "../../../utils/helpers";
import { getSchoolName } from "../../../config/schools";

export default function AlumniProfilePage() {
  const { id } = useParams();
  const query = useData(["alumni", id], `/alumni/${id}`);
  return (
    <>
      <Link to="/alumni" className="mb-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"><ArrowLeft size={15} /> All alumni</Link>
      <QueryState query={query}>
        {(a) => (
          <Card className="max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700" aria-hidden="true">{a.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{a.name}</h1>
                <p className="text-sm text-slate-500">{a.designation}{a.designation && a.company ? " at " : ""}{a.company}</p>
                {a.mentor && <Badge tone="green" className="mt-2"><Handshake size={12} className="mr-1" />Open to mentor students</Badge>}
              </div>
            </div>
            <dl className="mt-6 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2"><GraduationCap size={16} className="text-slate-400" /> {getSchoolName(a.school)}{a.program ? `, ${a.program}` : ""} - class of {a.graduationYear}</div>
              {a.company && <div className="flex items-center gap-2"><Briefcase size={16} className="text-slate-400" /> {a.company}</div>}
              {a.city && <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" /> {a.city}</div>}
            </dl>
            {a.bio && <p className="mt-5 text-sm text-slate-700">{a.bio}</p>}
            <div className="mt-5 flex gap-4 text-sm">
              {a.email && <a href={`mailto:${a.email}`} className="font-medium text-brand-600 hover:underline">Email</a>}
              {safeHref(a.linkedin) && <a href={safeHref(a.linkedin)} target="_blank" rel="noreferrer noopener" className="font-medium text-brand-600 hover:underline">LinkedIn</a>}
            </div>
          </Card>
        )}
      </QueryState>
    </>
  );
}
