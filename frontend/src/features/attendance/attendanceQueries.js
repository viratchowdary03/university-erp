import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { fetchData } from "../../api/demo";
import { useSaveMutation } from "../../api/queryClient";
import {
  getStudentAttendance, getMarkOverview, getMarkingSession, markAttendance, getSchoolReport, resolveSchool,
} from "./attendanceApi";

export const useStudentAttendance = (user) =>
  useQuery({
    queryKey: ["attendance", "student", user.id],
    queryFn: () => fetchData(() => getStudentAttendance(user.id), () => api.get("/attendance/me")),
  });

export const useMarkOverview = (user) =>
  useQuery({
    queryKey: ["attendance", "overview", user.id],
    queryFn: () => fetchData(() => getMarkOverview(user), () => api.get("/attendance/overview")),
  });

export const useMarkingSession = (user, code) =>
  useQuery({
    queryKey: ["attendance", "session", user.id, code],
    queryFn: () => fetchData(() => getMarkingSession(user, code), () => api.get("/attendance/session", { params: { subject: code } })),
    enabled: Boolean(code),
  });

export const useMarkAttendance = (user) =>
  useSaveMutation(({ code, presentIds }) =>
    fetchData(
      () => markAttendance(user, code, presentIds),
      () => api.post("/attendance/mark", { subjectCode: code, presentIds })
    )
  );

export const useSchoolReport = (user, requested) => {
  const school = resolveSchool(user, requested);
  return useQuery({
    queryKey: ["attendance", "report", user.id, school],
    queryFn: () =>
      fetchData(() => ({ school, ...getSchoolReport(school) }), () => api.get("/attendance/report", { params: { school } })),
  });
};
