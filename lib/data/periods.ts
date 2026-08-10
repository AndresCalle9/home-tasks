import "server-only";
import { supabase } from "@/lib/supabase/server-client";

export type Period = {
  id: string;
  startDate: string;
  endDate: string;
  status: "draft" | "assigned";
};

export async function getCurrentPeriod(): Promise<Period | null> {
  const { data, error } = await supabase
    .from("periods")
    .select("id, start_date, end_date, status")
    .eq("status", "assigned")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    startDate: data.start_date,
    endDate: data.end_date,
    status: data.status,
  };
}
