import { useSelector } from "react-redux";
import FilterSelect from "./FilterSelect";
import { SCHOOLS } from "../../config/schools";
import { hasFullAccess } from "../../config/permissions";

// School picker for roles that can see every school. Everyone else is limited to their own, so nothing shows.
export default function SchoolFilter({ value, onChange, withAll = true }) {
  const role = useSelector((s) => s.auth.user?.role);
  if (!hasFullAccess(role)) return null;
  return (
    <FilterSelect
      label="School"
      value={value}
      onChange={onChange}
      options={[...(withAll ? [{ value: "", label: "All schools" }] : []), ...SCHOOLS.map((s) => ({ value: s.code, label: s.name }))]}
    />
  );
}
