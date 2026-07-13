import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Supabase 클라이언트를 지연 생성한다.
 *
 * 모듈 최상위에서 createClient 를 호출하면 env 가 비어 있을 때 "supabaseUrl is required" 로
 * 즉시 던진다. `next build` 는 라우트 핸들러를 import 하는 것만으로 이 시점을 통과하므로,
 * 퀴즈를 쓰지 않는 빌드까지 실패한다. 실제 요청으로 호출될 때만 생성하도록 미룬다.
 *
 * @throws env 누락 시. 호출 측(라우트 핸들러)에서 500 으로 처리한다.
 */
export const getSupabase = (): SupabaseClient => {
  if (client) return client;

  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.");
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
};
