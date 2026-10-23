import { useSelector } from "react-redux";
import { ROLES } from "../../../config/roles";
import MyFeesPage from "./MyFeesPage";
import FeesAdminPage from "./FeesAdminPage";

export default function FeesPage() {
  const role = useSelector((s) => s.auth.user.role);
  return role === ROLES.STUDENT ? <MyFeesPage /> : <FeesAdminPage />;
}
