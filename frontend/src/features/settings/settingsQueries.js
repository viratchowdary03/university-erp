import { useQuery } from "@tanstack/react-query";
import { useSaveMutation } from "../../api/queryClient";
import { listPendingUsers, approveUser, rejectUser } from "./settingsApi";

export const usePendingUsers = (user) =>
  useQuery({ queryKey: ["approvals", user.role], queryFn: () => listPendingUsers(user.role) });

export const useApproveUser = () => useSaveMutation((id) => approveUser(id));
export const useRejectUser = () => useSaveMutation((id) => rejectUser(id));
