import { ApiError } from "../utils/ApiError.js";
import { hasPermission } from "../utils/permissions.js";

// allowRoles("admin", "hod")  -> only those roles (super_admin always passes)
export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Please sign in to continue"));
  if (req.user.role === "super_admin" || roles.includes(req.user.role)) return next();
  next(new ApiError(403, "You do not have permission to do this"));
};

// requirePermission(PERM.ADMISSIONS) -> uses the role/permission table
export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Please sign in to continue"));
  if (hasPermission(req.user.role, permission)) return next();
  next(new ApiError(403, "You do not have permission to do this"));
};
