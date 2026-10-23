import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { fetchData } from "../../api/demo";
import { getSchoolOverview, listPrograms, listSubjects } from "./academicApi";

// Schools, programs and subjects arrive together because the page shows them as tabs.
// `enabled: false` skips the request for people who cannot open Academic Setup.
export const useAcademic = (user, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["academic", user.id, user.role],
    enabled,
    queryFn: () =>
      fetchData(
        () => ({ schools: getSchoolOverview(user), programs: listPrograms(user), subjects: listSubjects(user) }),
        () => api.get("/academic")
      ),
  });
