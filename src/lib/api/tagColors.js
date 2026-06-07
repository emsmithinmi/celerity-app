import { supabase } from '../supabase'

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

export async function getTagColors() {
  const userId = await getUserId()
  if (!userId) return {}
  const { data, error } = await supabase
    .from('user_settings')
    .select('tag_colors')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.tag_colors ?? {}
}

export async function setTagColor(tag, bg, text) {
  const userId = await getUserId()
  if (!userId) return
  const current = await getTagColors()
  const updated = { ...current, [tag]: { bg, text } }
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, tag_colors: updated }, { onConflict: 'user_id' })
  if (error) throw error
  return updated
}

export async function removeTagColor(tag) {
  const userId = await getUserId()
  if (!userId) return
  const current = await getTagColors()
  const { [tag]: _, ...rest } = current
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, tag_colors: rest }, { onConflict: 'user_id' })
  if (error) throw error
  return rest
}
