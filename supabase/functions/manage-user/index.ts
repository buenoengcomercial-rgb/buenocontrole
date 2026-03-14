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

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
  if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: callerRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
  if (!callerRole || callerRole.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const { email, password, username, full_name, role } = body;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, full_name },
    });
    if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: corsHeaders });

    const userId = authData.user.id;
    await supabaseAdmin.from("profiles").insert({ id: userId, username, full_name, active: true });
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });

    return new Response(JSON.stringify({ userId, status: "created" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "update") {
    const { userId, full_name, role, password } = body;
    await supabaseAdmin.from("profiles").update({ full_name }).eq("id", userId);

    // Update role
    await supabaseAdmin.from("user_roles").update({ role }).eq("user_id", userId);

    // Update password if provided
    if (password) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    }

    return new Response(JSON.stringify({ status: "updated" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "toggle_active") {
    const { userId, active } = body;
    await supabaseAdmin.from("profiles").update({ active }).eq("id", userId);

    // If deactivating, also ban the user in auth
    if (!active) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });
    }

    return new Response(JSON.stringify({ status: active ? "activated" : "deactivated" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
});
