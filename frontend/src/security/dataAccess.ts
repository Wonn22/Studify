import { supabase } from '../database/database';

export type ResourceFileType = 'pdf' | 'xlsx' | 'docx' | 'link' | 'file';
export type GroupStatus = 'Active Research' | 'Completed' | 'Paused';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidUuid = (value?: string | null) =>
  typeof value === 'string' && UUID_PATTERN.test(value);

export const getResourceFileType = (fileName?: string | null): ResourceFileType => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  return ext === 'pdf' || ext === 'xlsx' || ext === 'docx' ? ext : 'file';
};

export const getCurrentSessionUser = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Session lookup failed:', error.message);
      return null;
    }

    return data.session?.user ?? null;
  } catch (error) {
    console.error('Session lookup failed:', error);
    return null;
  }
};

export const getEffectiveGroupStatus = (
  status?: string | null,
  deadline?: string | null,
): GroupStatus => {
  if (deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(`${deadline}T00:00:00`);
    if (!Number.isNaN(deadlineDate.getTime()) && deadlineDate < today) {
      return 'Completed';
    }
  }

  return status === 'Paused' || status === 'Completed' ? status : 'Active Research';
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

export interface FriendshipStatus {
  status: 'Pending' | 'Accepted' | 'Declined' | 'Blocked' | null;
  isRequester: boolean;
}

export const getFriendshipStatus = async (
  currentUserId?: string | null,
  profileId?: string | null,
): Promise<FriendshipStatus | null> => {
  if (!isValidUuid(currentUserId) || !isValidUuid(profileId) || currentUserId === profileId) {
    return null;
  }

  const { data, error } = await supabase
    .from('friendships')
    .select('status, requester_id')
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${currentUserId})`,
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  if (!data) {
    return { status: null, isRequester: false };
  }

  return {
    status: data.status as FriendshipStatus['status'],
    isRequester: data.requester_id === currentUserId,
  };
};

export const sendFriendRequest = async (
  currentUserId?: string | null,
  profileId?: string | null,
) => {
  if (!isValidUuid(currentUserId) || !isValidUuid(profileId) || currentUserId === profileId) {
    return { error: new Error('Invalid request') };
  }

  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${currentUserId})`,
    )
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { error: new Error('Friendship already exists') };
  }

  return supabase
    .from('friendships')
    .insert({
      requester_id: currentUserId,
      addressee_id: profileId,
      status: 'Pending',
    });
};

export const acceptFriendRequest = async (
  currentUserId?: string | null,
  profileId?: string | null,
) => {
  if (!isValidUuid(currentUserId) || !isValidUuid(profileId) || currentUserId === profileId) {
    return { error: new Error('Invalid request') };
  }

  return supabase
    .from('friendships')
    .update({ status: 'Accepted' })
    .eq('addressee_id', currentUserId)
    .eq('requester_id', profileId)
    .eq('status', 'Pending');
};

export const cancelFriendRequest = async (
  currentUserId?: string | null,
  profileId?: string | null,
) => {
  if (!isValidUuid(currentUserId) || !isValidUuid(profileId) || currentUserId === profileId) {
    return { error: new Error('Invalid request') };
  }

  return supabase
    .from('friendships')
    .delete()
    .eq('requester_id', currentUserId)
    .eq('addressee_id', profileId)
    .eq('status', 'Pending');
};

export interface NotificationInsert {
  recipient_id: string;
  sender_id?: string | null;
  type: 'friend_request' | 'friend_accepted' | 'session_join_request' | 'session_join_accepted' | 'session_join_rejected' | 'task_assigned';
  reference_id?: string | null;
  message: string;
}

export const getUnreadNotificationCount = async (userId?: string | null) => {
  if (!isValidUuid(userId)) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count ?? 0;
};

export const getNotifications = async (userId?: string | null, limit = 20) => {
  if (!isValidUuid(userId)) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*, sender:sender_id(full_name, avatar_url)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
};

export const markNotificationAsRead = async (notificationId?: string | null) => {
  if (!isValidUuid(notificationId)) return { error: new Error('Invalid notification ID') };

  return supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
};

export const markAllNotificationsAsRead = async (userId?: string | null) => {
  if (!isValidUuid(userId)) return { error: new Error('Invalid user ID') };

  return supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
};

export const createNotification = async (notification: NotificationInsert) => {
  if (!isValidUuid(notification.recipient_id)) {
    return { error: new Error('Invalid recipient ID') };
  }

  return supabase.from('notifications').insert(notification);
};

export const isGroupAdmin = async (groupId?: string | null, userId?: string | null) => {
  if (!isValidUuid(groupId) || !isValidUuid(userId)) return false;

  const { data, error } = await supabase
    .from('group_participants')
    .select('role')
    .eq('group_id', groupId)
    .eq('profile_id', userId)
    .eq('role', 'Admin')
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
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
