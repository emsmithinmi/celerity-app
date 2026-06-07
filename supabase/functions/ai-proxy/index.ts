// Server-side proxy for AI providers that block direct browser access (e.g. Anthropic).
// The client sends { provider, apiKey, model, messages } — this forwards server-side.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { provider, apiKey, model, messages, temperature = 0.5, tools } = await req.json()

    if (!apiKey || !model || !messages) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    let text: string
    let responseContent: unknown[] | undefined
    let stopReason: string | undefined

    if (provider === 'anthropic') {
      const systemMsg = messages.find((m: { role: string }) => m.role === 'system')
      const userMessages = messages.filter((m: { role: string }) => m.role !== 'system')

      const body: Record<string, unknown> = {
        model,
        max_tokens: 2048,
        temperature,
        messages: userMessages,
      }
      if (systemMsg) body.system = systemMsg.content
      if (tools && tools.length > 0) body.tools = tools

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Anthropic error (${res.status}): ${err}`)
      }

      const json = await res.json()
      stopReason = json.stop_reason

      if (tools && tools.length > 0) {
        // Return full content array so caller can handle tool_use blocks
        responseContent = json.content
        const textBlock = json.content.find((b: { type: string }) => b.type === 'text')
        text = textBlock?.text ?? ''
      } else {
        text = json.content[0].text
      }

    } else {
      // OpenAI-compatible providers
      const baseUrl = req.headers.get('x-base-url') || 'https://api.openai.com/v1'
      const body = { model, messages, temperature }

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`AI provider error (${res.status}): ${err}`)
      }

      const json = await res.json()
      text = json.choices[0].message.content
    }

    const payload: Record<string, unknown> = { text }
    if (responseContent) payload.content = responseContent
    if (stopReason) payload.stop_reason = stopReason

    return new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (err) {
    console.error('ai-proxy error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
