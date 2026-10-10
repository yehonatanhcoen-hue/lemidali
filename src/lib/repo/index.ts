import { isSupabaseConfigured } from "../supabase/client";
import { localRepo } from "./local";
import { supabaseRepo } from "./supabase";
import type { Repository } from "./types";

export const repo: Repository = isSupabaseConfigured ? supabaseRepo : localRepo;
export { NotImplementedError } from "./types";
export type { Repository } from "./types";
