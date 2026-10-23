import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { fetchData } from "../../api/demo";
import { useSaveMutation } from "../../api/queryClient";
import { listFaculty, createFaculty, updateFaculty, deleteFaculty } from "./facultyApi";

export const useFaculty = (user) =>
  useQuery({
    queryKey: ["faculty", "list", user.id, user.role],
    queryFn: () => fetchData(() => listFaculty(user), () => api.get("/faculty")),
  });

export const useCreateFaculty = (user) =>
  useSaveMutation((values) => fetchData(() => createFaculty(user, values), () => api.post("/faculty", values)));
export const useUpdateFaculty = (user) =>
  useSaveMutation(({ id, values }) => fetchData(() => updateFaculty(user, id, values), () => api.put(`/faculty/${id}`, values)));
export const useDeleteFaculty = (user) =>
  useSaveMutation((id) => fetchData(() => deleteFaculty(user, id), () => api.delete(`/faculty/${id}`)));
