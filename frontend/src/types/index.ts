export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  major: string | null;
  bio: string | null;
  interests: string[] | null;
  total_study_time_hours: number;
  consistency_percent: number;
  created_at: string;
}

export interface Session {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  max_members: number;
  meeting_link: string | null;
  created_by: string;
  created_at: string;
}

export interface SessionParticipant {
  session_id: string;
  profile_id: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  deadline: string | null;
  status: string | null;
  created_at: string;
  group_url: string | null;
  created_by: string | null;
  is_private: boolean;
}

export interface GroupParticipant {
  group_id: string;
  profile_id: string;
  role: string;
  joined_at: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  category: string;
  assignee_id: string | null;
  group_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  group_id: string | null;
  content: string;
  created_at: string;
}

export interface Resource {
  id: string;
  group_id: string | null;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Blocked';
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: string;
  reference_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}
