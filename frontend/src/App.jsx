import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import AppRoutes from "./routes/AppRoutes";
import api from "./api/axios";
import { MOCK } from "./api/demo";
import { setUser } from "./features/auth/authSlice";

export default function App() {
  const dispatch = useDispatch();
  const signedIn = useSelector((s) => Boolean(s.auth.user));

  // The saved login can be days old. Ask the server who this is now, so a changed role, a suspended account
  // or an expired session shows up at once instead of on the first failing click.
  useEffect(() => {
    if (MOCK || !signedIn) return;
    api.get("/auth/me").then(({ data }) => dispatch(setUser(data.data.user))).catch(() => {});
  }, [signedIn, dispatch]);

  return <AppRoutes />;
}
