import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { safeStorage } from "@/lib/safe-storage";

const SELECTED_STORE_KEY = "selected_store_id";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      const isLoginPage = window.location.pathname === "/" || window.location.pathname === "/auth";
      if (!isLoginPage) {
        safeStorage.removeItem("bk_token");
        window.location.href = "/";
      }
    }
    const text = await res.text();
    let message = text || res.statusText;
    try {
      const json = JSON.parse(text);
      if (json.message) message = json.message;
    } catch {}
    throw new Error(`${res.status}: ${message}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let body = data;

  // For POST requests, inject storeId from localStorage if admin/area has selected a store
  if (method === "POST" && data && typeof data === "object" && !Array.isArray(data)) {
    const selectedStoreId = safeStorage.getItem(SELECTED_STORE_KEY);
    if (selectedStoreId && !("storeId" in (data as Record<string, unknown>))) {
      body = { ...(data as Record<string, unknown>), storeId: selectedStoreId };
    }
  }

  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
