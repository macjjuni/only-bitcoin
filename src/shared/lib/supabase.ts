import { createClient } from "@supabase/supabase-js";

// 값이 없으면 createClient 가 모듈 로드 시점에 "supabaseUrl is required" 로 던진다.
// 서버 전용 모듈이므로 배포 환경에서 env 누락을 즉시 드러내는 게 의도된 동작이다.
const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
