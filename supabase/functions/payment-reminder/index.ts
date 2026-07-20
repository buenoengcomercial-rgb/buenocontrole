import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.headers.get('authorization') !== `Bearer ${supabaseKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + 5);
    const reminderStr = reminderDate.toISOString().slice(0, 10);

    const pendingItems: string[] = [];

    // Check DAS expenses
    const { data: dasData } = await supabase
      .from('das_expenses')
      .select('*')
      .eq('paid', false)
      .lte('due_date', reminderStr);

    if (dasData && dasData.length > 0) {
      for (const das of dasData) {
        const isOverdue = das.due_date < todayStr;
        pendingItems.push(
          `• DAS ${das.month}: R$ ${Number(das.value).toFixed(2)} - Vencimento: ${das.due_date} ${isOverdue ? '⚠️ VENCIDO' : '⏰ Próximo do vencimento'}`
        );
      }
    }

    // Check company charges (individual INSS/FGTS records)
    const { data: chargesData } = await supabase
      .from('company_charges')
      .select('*')
      .eq('paid', false)
      .lte('due_date', reminderStr);

    if (chargesData && chargesData.length > 0) {
      for (const charge of chargesData) {
        const isOverdue = charge.due_date < todayStr;
        const val = Number(charge.value);
        if (val > 0) {
          pendingItems.push(
            `• ${charge.charge_type} ${charge.month}: R$ ${val.toFixed(2)} - Vencimento: ${charge.due_date} ${isOverdue ? '⚠️ VENCIDO' : '⏰ Próximo do vencimento'}`
          );
        }
      }
    }

    if (pendingItems.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum pagamento pendente próximo do vencimento.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subject = `[EngControl] ${pendingItems.length} pagamento(s) pendente(s)`;
    const body = `Olá,\n\nOs seguintes pagamentos estão pendentes ou próximos do vencimento:\n\n${pendingItems.join('\n')}\n\nPor favor, verifique e realize os pagamentos necessários.\n\n— Sistema EngControl`;

    console.log(`[payment-reminder] ${pendingItems.length} pending items found`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);

    // Try to send email
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableApiKey) {
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            to: 'buenoeng.comercial@gmail.com',
            subject,
            text: body,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e40af;">⚠️ Pagamentos Pendentes</h2>
              <p>Os seguintes pagamentos estão pendentes ou próximos do vencimento:</p>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                ${pendingItems.map(item => `<p style="margin: 8px 0; font-size: 14px;">${item}</p>`).join('')}
              </div>
              <p style="color: #64748b; font-size: 13px;">— Sistema EngControl</p>
            </div>`,
          }),
        });
        console.log(`Email send response status: ${emailResponse.status}`);
      } catch (emailErr) {
        console.log('Email sending not configured yet, skipping email notification');
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      pendingCount: pendingItems.length,
      items: pendingItems,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in payment-reminder:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
