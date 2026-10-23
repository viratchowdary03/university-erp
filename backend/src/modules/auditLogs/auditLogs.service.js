import { AuditLog } from "./auditLog.model.js";
import { parsePaging, pagedResult, escapeRegex } from "../../utils/pagination.js";

export async function listLogs(query) {
  const paging = parsePaging(query, { defaultLimit: 25, maxLimit: 100 });
  const filter = {};
  if (query.module) filter.module = String(query.module);
  if (query.method) filter.method = String(query.method).toUpperCase();
  if (query.q) filter.$or = [{ userName: new RegExp(escapeRegex(query.q), "i") }, { path: new RegExp(escapeRegex(query.q), "i") }];
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit),
    AuditLog.countDocuments(filter),
  ]);
  return pagedResult(items.map((i) => i.toJSON()), total, paging);
}
