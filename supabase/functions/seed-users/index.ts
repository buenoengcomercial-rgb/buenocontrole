import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const users = [
    { username: "cananda.machado", password: "16052019", full_name: "Cananda Machado", role: "admin" },
    { username: "kennedy.bueno", password: "16052019", full_name: "Kennedy Bueno", role: "admin" },
    { username: "kelper.bueno", password: "16052019", full_name: "Kelper Bueno", role: "admin" },
    { username: "diego.batista", password: "16052019", full_name: "Diego Batista", role: "seguranca_docs" },
  ];

  const results = [];

  for (const u of users) {
    const email = `${u.username}@buenocontrole.app`;

    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", u.username)
      .maybeSingle();

    if (existingProfile) {
      results.push({ username: u.username, status: "already_exists" });
      continue;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: u.password,
      email_confirm: true,
      user_metadata: { username: u.username, full_name: u.full_name },
    });

    if (authError) {
      results.push({ username: u.username, status: "error", error: authError.message });
      continue;
    }

    const userId = authData.user.id;

    // Create profile
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      username: u.username,
      full_name: u.full_name,
      active: true,
    });

    // Create role
    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: u.role,
    });

    results.push({ username: u.username, status: "created", role: u.role });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
