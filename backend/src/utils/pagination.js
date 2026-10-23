// ?page=2&limit=20 -> { page, limit, skip }. Used by lists that can grow large (audit logs, messages).
export function parsePaging(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const pagedResult = (items, total, { page, limit }) => ({
  items,
  total,
  page,
  pages: Math.max(1, Math.ceil(total / limit)),
});

// Escapes user text so it can be used safely inside a RegExp (search boxes)
export const escapeRegex = (text = "") => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
