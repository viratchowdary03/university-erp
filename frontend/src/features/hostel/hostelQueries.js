import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { fetchData } from "../../api/demo";
import { useSaveMutation } from "../../api/queryClient";
import {
  getHostelOverview, getMyHostel, listAllocatableStudents, suggestBed,
  allocateRoom, updateAllocation, vacateRoom,
} from "./hostelApi";

export const useHostelOverview = (user) =>
  useQuery({
    queryKey: ["hostel", "overview", user.id],
    queryFn: () => fetchData(() => getHostelOverview(user), () => api.get("/hostel/overview")),
  });

export const useMyHostel = (user) =>
  useQuery({
    queryKey: ["hostel", "mine", user.id],
    queryFn: () => fetchData(() => getMyHostel(user), () => api.get("/hostel/me")),
  });

export const useAllocatableStudents = (user, enabled) =>
  useQuery({
    queryKey: ["hostel", "allocatable", user.id],
    queryFn: () => fetchData(() => listAllocatableStudents(user), () => api.get("/hostel/allocatable")),
    enabled,
  });

export const useSuggestedBed = (user, hostelId) =>
  useQuery({
    queryKey: ["hostel", "suggest", hostelId],
    queryFn: () => fetchData(() => suggestBed(user, hostelId), () => api.get("/hostel/suggest", { params: { hostel: hostelId } })),
    enabled: Boolean(hostelId),
    staleTime: 0,
  });

export const useAllocateRoom = (user) =>
  useSaveMutation((values) => fetchData(() => allocateRoom(user, values), () => api.post("/hostel/allocations", values)));
export const useUpdateAllocation = (user) =>
  useSaveMutation(({ studentId, values }) =>
    fetchData(() => updateAllocation(user, studentId, values), () => api.put(`/hostel/allocations/${studentId}`, values))
  );
export const useVacateRoom = (user) =>
  useSaveMutation((studentId) => fetchData(() => vacateRoom(user, studentId), () => api.delete(`/hostel/allocations/${studentId}`)));
