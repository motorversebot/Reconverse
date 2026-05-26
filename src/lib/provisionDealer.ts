import { supabase } from "@/integrations/supabase/client";

/**
 * Attempts to provision a dealer for the current user if they signed up
 * via the self-service flow and don't yet have a dealer membership.
 * Returns the dealer_id if provisioned or already exists, null otherwise.
 */
export async function provisionDealerIfNeeded(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("provision-dealer");
    if (error) {
      console.error("Provision dealer error:", error);
      return null;
    }
    return data?.dealer_id ?? null;
  } catch {
    return null;
  }
}
