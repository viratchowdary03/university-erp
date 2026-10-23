import { AuditLog } from "../modules/auditLogs/auditLog.model.js";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

// Records who changed what. It never stores request bodies (they can hold passwords) and a failure
// to write the log never affects the request itself.
export const auditTrail = (req, res, next) => {
  if (SAFE.has(req.method)) return next();
  res.on("finish", () => {
    const path = req.originalUrl.split("?")[0].replace(/^\/api/, "");
    const actor = req.user;
    AuditLog.create({
      userId: actor?._id,
      userName: actor?.name || req.body?.email || "anonymous",
      role: actor?.role,
      method: req.method,
      path,
      module: path.split("/")[1] || "",
      statusCode: res.statusCode,
      ip: req.ip,
    }).catch(() => {});
  });
  next();
};
