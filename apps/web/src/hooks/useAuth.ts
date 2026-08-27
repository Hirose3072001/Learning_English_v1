import { useAuthContext } from "@/contexts/AuthContext";

/**
 * useAuth hook that now utilizes the global AuthContext.
 * This ensures all components share the same auth state and 
 * redundant network calls / listeners are avoided.
 */
export function useAuth() {
  return useAuthContext();
}
