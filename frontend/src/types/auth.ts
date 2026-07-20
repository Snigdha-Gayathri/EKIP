export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  org_id: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}
