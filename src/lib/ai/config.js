import { supabase } from '../supabase'

const PROVIDER_PRESETS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-6',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-medium',
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
  },
  custom: {
    baseUrl: '',
    model: '',
  },
}

export const PROVIDERS = Object.keys(PROVIDER_PRESETS)
export { PROVIDER_PRESETS }

export function getProviderPreset(provider) {
  return PROVIDER_PRESETS[provider] ?? PROVIDER_PRESETS.custom
}

// Read AI config from Supabase user_metadata
export async function getAIConfig() {
  const { data: { user } } = await supabase.auth.getUser()
  const meta = user?.user_metadata ?? {}
  return {
    provider: meta.ai_provider ?? null,
    model:    meta.ai_model    ?? null,
    baseUrl:  meta.ai_base_url ?? null,
    apiKey:   meta.ai_api_key  ?? null,
  }
}

// Write AI config to Supabase user_metadata
export async function saveAIConfig({ provider, model, baseUrl, apiKey }) {
  const { error } = await supabase.auth.updateUser({
    data: {
      ai_provider: provider,
      ai_model:    model,
      ai_base_url: baseUrl,
      ai_api_key:  apiKey,
    },
  })
  if (error) throw error
}

export function isConfigured(config) {
  return !!(config?.provider && config?.apiKey && config?.model && config?.baseUrl)
}
