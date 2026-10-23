// Small helpers every page uses to talk to the backend.
//
//   const exams = useData(["exams"], "/exams");                       // GET, cached, refreshes when data changes
//   const send = useSend();
//   await send.mutateAsync({ method: "post", url: "/exams", body });  // POST/PUT/PATCH/DELETE, then every list refreshes
//   downloadFile("/fees/payments/123/receipt", "receipt.pdf");        // PDF and other files
import { useQuery } from "@tanstack/react-query";
import api from "./axios";
import { realOnly } from "./demo";
import { useSaveMutation } from "./queryClient";

export function useData(key, url, { params, enabled = true, refetchInterval, staleTime } = {}) {
  return useQuery({
    queryKey: [...key, params ?? null],
    queryFn: () => realOnly(() => api.get(url, { params })),
    enabled,
    refetchInterval,
    staleTime,
  });
}

export function useSend() {
  return useSaveMutation(({ method, url, body }) => realOnly(() => api.request({ method, url, data: body })));
}

// Files need the login token, so they are fetched with the API client and then saved by the browser
export async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
