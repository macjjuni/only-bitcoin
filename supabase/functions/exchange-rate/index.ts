import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const allowedOrigins = [
  "http://localhost:4002",           // 로컬 테스트
  "https://btc-price.web.app",       // 배포 도메인 1
  "https://btc-price-9503c.web.app" // 배포 도메인 2
];

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (!allowedOrigins.includes(origin)) return new Response("Not allowed", { status: 403 });

  const { data, error } = await supabase
    .from("exchange_rate")
    .select("krw, updated")
    .order("id", { ascending: false })
    .limit(1)
    .single();
  console.log(data)
  console.log(error)
  if (error || !data) return new Response("No data", { status: 500 });

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
    },
  });
});
