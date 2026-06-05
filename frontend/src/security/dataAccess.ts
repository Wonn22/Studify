import { supabase } from '../database/database';

export type ResourceFileType = 'pdf' | 'xlsx' | 'docx' | 'link' | 'file';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidUuid = (value?: string | null) =>
  typeof value === 'string' && UUID_PATTERN.test(value);

export const getResourceFileType = (fileName?: string | null): ResourceFileType => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  return ext === 'pdf' || ext === 'xlsx' || ext === 'docx' ? ext : 'file';
};

export const getUploadValidationError = (file: File) => {
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'File is too large. Maximum upload size is 10MB.';
  }

  return null;
};

export const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isGroupMember = async (groupId?: string | null, userId?: string | null) => {
  if (!isValidUuid(groupId) || !isValidUuid(userId)) return false;

  const { data, error } = await supabase
    .from('group_participants')
    .select('group_id')
    .eq('group_id', groupId)
    .eq('profile_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Group membership check failed:', error.message);
    return false;
  }

  return Boolean(data);
};

export const getAcceptedFriendshipId = async (
  currentUserId?: string | null,
  contactId?: string | null,
) => {
  if (!isValidUuid(currentUserId) || !isValidUuid(contactId) || currentUserId === contactId) {
    return null;
  }

  const { data, error } = await supabase
    .from('friendships')
    .select('id')
    .eq('status', 'Accepted')
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${contactId}),and(requester_id.eq.${contactId},addressee_id.eq.${currentUserId})`,
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Friendship access check failed:', error.message);
    return null;
  }

  return data?.id ?? null;
};

export const getProjectFilesStoragePath = (publicUrl?: string | null) => {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    const marker = '/project-files/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
};
