import { hasFullAccess } from "../config/permissions";

// Which school's data this person may see.
// null means every school (super admin, registrar, admin). Everyone else sees their own school only.
export const visibleSchool = (user) => (hasFullAccess(user?.role) ? null : user?.school ?? "");

export const canSeeSchool = (user, schoolCode) => {
  const scope = visibleSchool(user);
  return scope === null || scope === schoolCode;
};
