import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { fetchData } from "../../api/demo";
import { useSaveMutation } from "../../api/queryClient";
import { listStudents, getStudentDetails, createStudent, updateStudent, deleteStudent } from "./studentsApi";

export const useStudents = (user) =>
  useQuery({
    queryKey: ["students", "list", user.id, user.role],
    queryFn: () => fetchData(() => listStudents(user), () => api.get("/students")),
  });

export const useStudentDetails = (user, id) =>
  useQuery({
    queryKey: ["students", "detail", id],
    queryFn: () => fetchData(() => getStudentDetails(user, id), () => api.get(`/students/${id}`)),
    enabled: Boolean(id),
  });

export const useCreateStudent = (user) =>
  useSaveMutation((values) => fetchData(() => createStudent(user, values), () => api.post("/students", values)));
export const useUpdateStudent = (user) =>
  useSaveMutation(({ id, values }) => fetchData(() => updateStudent(user, id, values), () => api.put(`/students/${id}`, values)));
export const useDeleteStudent = (user) =>
  useSaveMutation((id) => fetchData(() => deleteStudent(user, id), () => api.delete(`/students/${id}`)));
