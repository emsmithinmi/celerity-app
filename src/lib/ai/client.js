import { getAIConfig, isConfigured } from './config'
import { callOpenAI } from './adapters/openai'
import { callAnthropic } from './adapters/anthropic'

// Brand-agnostic AI call. Skills pass messages in OpenAI format; this routes
// to the right adapter based on the user's configured provider.
export async function callAI(messages, options = {}) {
  const config = await getAIConfig()

  if (!isConfigured(config)) {
    throw new Error('AI is not configured. Go to Settings to add your provider and API key.')
  }

  if (config.provider === 'anthropic') {
    return callAnthropic({
      apiKey: config.apiKey,
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.4,
    })
  }

  return callOpenAI({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    messages,
    temperature: options.temperature ?? 0.4,
    responseFormat: options.responseFormat,
  })
}

// Convenience: sends a minimal message to verify config works
export async function testConnection() {
  const response = await callAI([
    { role: 'user', content: 'Reply with exactly: OK' },
  ])
  return response?.trim().startsWith('OK')
}
