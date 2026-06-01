export interface UserDto {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}
