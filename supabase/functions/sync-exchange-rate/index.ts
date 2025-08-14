import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

const KOREAEXIM_AUTH_TOKEN = Deno.env.get("KOREAEXIM_TOKEN");
const API_URL = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${KOREAEXIM_AUTH_TOKEN}&searchdate=${new Date().toISOString().split("T")[0]}&data=AP01`;


Deno.serve(async () => {
  try {
    const res = await fetch(API_URL);
    const rates = await res.json();
    const usdRate = rates.find((r: any) => r.cur_unit === "USD")?.deal_bas_r;
    if (!usdRate) return new Response("USD rate not found", { status: 500 });

    const { data, error } = await supabase
      .from("exchange_rate")
      .update({
        krw: parseFloat(usdRate.replace(/,/g, "")),
        updated: new Date().toISOString().split("T")[0],
      }).eq("id", 1);

    if (error) return new Response(JSON.stringify(error), { status: 500 });

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.log(err);
    return new Response(JSON.stringify(err), { status: 500 });
  }
});
