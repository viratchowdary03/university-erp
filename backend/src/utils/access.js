import { hasFullAccess, hasPermission, canManage } from "./permissions.js";
import { ApiError } from "./ApiError.js";

// null means every school (super admin, registrar, admin). Everyone else sees their own school only.
export const visibleSchool = (user) => (hasFullAccess(user.role) ? null : user.school || "__none__");

// Only the roles listed for this module (see MANAGE_ROLES in permissions.js) may add, change and delete
export function assertManager(user, permission) {
  if (!hasPermission(user.role, permission) || !canManage(user.role, permission)) {
    throw new ApiError(403, "You are not allowed to change these records");
  }
}

export function assertRoles(user, roles, message = "You do not have permission to do this") {
  if (!roles.includes(user.role)) throw new ApiError(403, message);
}

// A school code the person may work with: full-access roles may pick any, others get their own
export function schoolFor(user, requested) {
  const scope = visibleSchool(user);
  return scope === null ? requested || "" : scope;
}
