import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { fetchData } from "../../api/demo";
import { getTimetable } from "./timetableApi";

export const useTimetable = (user, school) =>
  useQuery({
    queryKey: ["timetable", user.id, user.role, school],
    queryFn: () =>
      fetchData(
        () => ({ ...getTimetable(user, school), myFacultyId: user.id }),
        () => api.get("/timetable", { params: { school } })
      ),
  });
