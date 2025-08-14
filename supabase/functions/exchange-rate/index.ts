import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get("URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);
const env = Deno.env.get("NODE_ENV");

const allowedOrigins = env === "production"
  ? ["https://btc-price.web.app", "https://btc-price-9503c.web.app"]
  : ["http://localhost:4002"];


Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (!allowedOrigins.includes(origin)) return new Response("Not allowed", { status: 403 });

  const { data, error } = await supabase
    .from("exchange_rate")
    .select("krw, updated")
    .eq("id", 1)
    .single();

  if (error || !data) return new Response("No data", { status: 500 });

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
    },
  });
});
