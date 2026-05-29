// Anthropic uses a different auth header and request shape.
// We normalise the OpenAI message format into Anthropic's format here.
export async function callAnthropic({ apiKey, model, messages, temperature = 0.4 }) {
  // Split system message out — Anthropic takes it as a top-level field
  const systemMsg = messages.find(m => m.role === 'system')
  const userMessages = messages.filter(m => m.role !== 'system')

  const body = {
    model,
    max_tokens: 2048,
    temperature,
    messages: userMessages,
  }
  if (systemMsg) body.system = systemMsg.content

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic request failed (${res.status}): ${err}`)
  }

  const json = await res.json()
  return json.content[0].text
}
