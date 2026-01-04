import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          errorMessage = json.error || json.message || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch {
      // If we can't read the response, use status text
    }
    
    // Provide more helpful error messages
    if (res.status === 500) {
      errorMessage = errorMessage || "A server error has occurred. Please try again later.";
    } else if (res.status === 401) {
      errorMessage = "Authentication failed. Please log in again.";
    } else if (res.status === 403) {
      errorMessage = "You don't have permission to perform this action.";
    } else if (res.status === 404) {
      errorMessage = "The requested resource was not found.";
    } else if (res.status === 0 || res.status === 504) {
      errorMessage = "Unable to connect to the server. Please check your internet connection.";
    }
    
    const error = new Error(`${res.status}: ${errorMessage}`);
    (error as any).status = res.status;
    throw error;
  }
}

import { supabase } from "./supabase";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/queryClient.ts:41',message:'apiRequest entry',data:{method,url,hasData:!!data,dataKeys:data?Object.keys(data as any):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/queryClient.ts:48',message:'Session retrieved',data:{hasSession:!!session,hasToken:!!token,tokenLength:token?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const headers: Record<string, string> = {};
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/queryClient.ts:58',message:'Making fetch request',data:{method,url,hasAuth:!!token,bodySize:data?JSON.stringify(data).length:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/queryClient.ts:64',message:'Fetch response received',data:{status:res.status,statusText:res.statusText,ok:res.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/queryClient.ts:68',message:'apiRequest error',data:{errorMessage:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : 'Unknown',isNetworkError:error instanceof TypeError && error.message.includes('fetch')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    // Re-throw with more context if it's a network error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Network error: Unable to connect to the server. Please check your internet connection and try again.");
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(queryKey.join("/") as string, {
        headers,
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
