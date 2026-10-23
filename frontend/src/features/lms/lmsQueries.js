import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { fetchData } from "../../api/demo";
import { listCourses } from "./lmsApi";

export const useCourses = (user, school) =>
  useQuery({
    queryKey: ["lms", "courses", user.id, school],
    queryFn: () => fetchData(() => listCourses(user, school), () => api.get("/lms/courses", { params: { school } })),
  });
