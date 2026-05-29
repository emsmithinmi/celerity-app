// Handles all OpenAI-compatible providers: OpenAI, Gemini, Groq, Mistral, Ollama, custom
export async function callOpenAI({ baseUrl, apiKey, model, messages, temperature = 0.4, responseFormat }) {
  const body = { model, messages, temperature }
  if (responseFormat) body.response_format = responseFormat

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
    throw new Error(`AI request failed (${res.status}): ${err}`)
  }

  const json = await res.json()
  return json.choices[0].message.content
}
