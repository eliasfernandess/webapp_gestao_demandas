// Supabase Edge Function: generate-ai
// Deploy with: supabase functions deploy generate-ai
// Set secret: supabase secrets set OPENAI_API_KEY=your_key_here

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY not configured')
        }

        const { prompt } = await req.json()

        if (!prompt || typeof prompt !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Prompt is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const systemPrompt = `Você é um assistente especializado em gestão de demandas de TI.
Dada uma descrição ou palavra-chave, gere:
1. Um título profissional e conciso para a demanda
2. Uma descrição técnica organizada com contexto, objetivo e critérios de aceitação
3. Uma sugestão de prioridade: "Medium", "High" ou "Highst" (baseado na criticidade)
4. Um checklist técnico opcional com 3-5 itens

Responda SOMENTE em JSON válido, no formato:
{
  "titulo": "string",
  "descricao": "string",
  "prioridade": "Medium|High|Highst",
  "checklist": ["item1", "item2", "item3"]
}`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 800,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error?.message || 'OpenAI API error')
        }

        const messageContent = data.choices[0].message.content
        let parsed
        try {
            parsed = JSON.parse(messageContent)
        } catch {
            // If response is not valid JSON, try to extract JSON from the text
            const jsonMatch = messageContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0])
            } else {
                throw new Error('Failed to parse AI response')
            }
        }

        return new Response(
            JSON.stringify(parsed),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
