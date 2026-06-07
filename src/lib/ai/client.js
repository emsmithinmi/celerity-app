import { supabase } from '../supabase'
import { getAIConfig, isConfigured } from './config'

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`

// Routes all AI calls through the Supabase Edge Function proxy to avoid CORS issues.
// Skills pass messages in OpenAI format — the proxy handles provider differences.
export async function callAI(messages, options = {}) {
  const config = await getAIConfig()

  if (!isConfigured(config)) {
    throw new Error('AI is not configured. Go to Settings to add your provider and API key.')
  }

  const { data: { session } } = await supabase.auth.getSession()

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  }

  // Pass base URL for OpenAI-compatible providers
  if (config.provider !== 'anthropic') {
    headers['x-base-url'] = config.baseUrl
  }

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.4,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI proxy error (${res.status}): ${err}`)
  }

  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.text
}

// Calls AI with tool use support. Runs the full multi-turn loop until end_turn.
// executors: { [toolName]: async (input) => result }
// Returns { text, created: [{ tool, input, result }] }
export async function callAIWithTools(messages, tools, executors, options = {}) {
  const config = await getAIConfig()

  if (!isConfigured(config)) {
    throw new Error('AI is not configured. Go to Settings to add your provider and API key.')
  }

  const { data: { session } } = await supabase.auth.getSession()

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  }

  if (config.provider !== 'anthropic') {
    headers['x-base-url'] = config.baseUrl
  }

  const runningMessages = [...messages]
  const created = []

  for (let i = 0; i < 10; i++) {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        messages: runningMessages,
        temperature: options.temperature ?? 0.75,
        tools,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`AI proxy error (${res.status}): ${err}`)
    }

    const json = await res.json()
    if (json.error) throw new Error(json.error)

    if (json.stop_reason !== 'tool_use') {
      return { text: json.text, created }
    }

    // Process tool_use blocks
    const toolUseBlocks = (json.content || []).filter(b => b.type === 'tool_use')
    if (toolUseBlocks.length === 0) {
      return { text: json.text, created }
    }

    // Append assistant message with the full content
    runningMessages.push({ role: 'assistant', content: json.content })

    // Execute each tool and collect results
    const toolResults = []
    for (const block of toolUseBlocks) {
      const executor = executors[block.name]
      let result
      if (executor) {
        result = await executor(block.input)
        created.push({ tool: block.name, input: block.input, result })
      } else {
        result = { error: `Unknown tool: ${block.name}` }
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      })
    }

    runningMessages.push({ role: 'user', content: toolResults })
  }

  throw new Error('Tool use loop exceeded maximum iterations')
}

// Sends a minimal message to verify config works
export async function testConnection() {
  const response = await callAI([
    { role: 'user', content: 'Reply with exactly: OK' },
  ])
  return response?.trim().startsWith('OK')
}
