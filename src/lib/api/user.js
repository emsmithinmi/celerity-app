import { supabase } from '../supabase'

export async function uploadUserAvatar(userId, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `user/${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
  if (updateError) throw updateError

  return publicUrl
}
