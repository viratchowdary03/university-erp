import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { fetchData } from "../../api/demo";
import { classDay } from "../../utils/helpers";
import { getAdminDashboard, getFacultyDashboard, getStudentDashboard } from "./dashboardApi";

export const useAdminDashboard = (user) =>
  useQuery({
    queryKey: ["dashboard", "admin", user.id],
    queryFn: () => fetchData(() => getAdminDashboard(user), () => api.get("/dashboard/admin")),
  });

// The browser knows which weekday to show, so it tells the server (0 = Monday)
const withDay = async (load) => {
  const day = classDay();
  const data = await load(day);
  return { ...data, day };
};

export const useFacultyDashboard = (user) =>
  useQuery({
    queryKey: ["dashboard", "faculty", user.id],
    queryFn: () =>
      withDay((day) =>
        fetchData(() => { const { day: ignored, ...rest } = getFacultyDashboard(user); return rest; }, () => api.get("/dashboard/faculty", { params: { day: day.index } }))
      ),
  });

export const useStudentDashboard = (user) =>
  useQuery({
    queryKey: ["dashboard", "student", user.id],
    queryFn: () =>
      withDay((day) =>
        fetchData(() => { const { day: ignored, ...rest } = getStudentDashboard(user); return rest; }, () => api.get("/dashboard/student", { params: { day: day.index } }))
      ),
  });
