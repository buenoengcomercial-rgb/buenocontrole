Deno.serve(() => new Response(
  JSON.stringify({ error: 'This bootstrap endpoint is disabled.' }),
  { status: 410, headers: { 'Content-Type': 'application/json' } },
));
