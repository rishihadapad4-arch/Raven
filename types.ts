
export type OperativePosition = 'Commander' | 'Sentinel' | 'Architect' | 'Operative';

export interface User {
  id: string;
  username: string; 
  displayName: string; 
  avatar: string; 
  bio: string;
  joinedAt: number;
  createdAt: number;
  commsCode: string;
  position: OperativePosition;
  houseIds: string[];
  contactIds: string[];
}

export interface Friend {
  id: string;
  username: string;
  avatar: string;
  commsCode: string;
  position: OperativePosition;
  status?: 'online' | 'offline';
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  image?: string; 
  timestamp: number;
  houseId: string; 
}

export interface Community {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  inviteCode: string;
  ownerId: string;
  membersCount: number;
  activityScore: number;
  tags: string[];
  isPrivate: boolean;
  participants: Friend[];
}

export interface AIInsight {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'cautionary';
  recommendations: string[];
}

export type ViewType = 'landing' | 'auth' | 'setup' | 'dashboard' | 'house' | 'profile' | 'edit_profile' | 'moderation' | 'dm';
