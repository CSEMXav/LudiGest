export type Role = "USER" | "ADMIN";
export type GameStatus = "AVAILABLE" | "BORROWED" | "SUSPENDED";
export type GameCategory = "escape" | "famille" | "ambiance" | "enfant" | "initié" | "expert";
export type LudiLocation = "Joinville" | "La Rapée";
export const LOCATIONS: LudiLocation[] = ["Joinville", "La Rapée"];

export const CATEGORY_CONFIG: Record<GameCategory, { label: string; bg: string; text: string; border: string }> = {
  escape:   { label: "Escape",   bg: "bg-red-500",    text: "text-white", border: "border-l-red-500" },
  famille:  { label: "Famille",  bg: "bg-orange-400", text: "text-white", border: "border-l-orange-400" },
  ambiance: { label: "Ambiance", bg: "bg-blue-500",   text: "text-white", border: "border-l-blue-500" },
  enfant:   { label: "Enfant",   bg: "bg-yellow-400", text: "text-white", border: "border-l-yellow-400" },
  "initié": { label: "Initié",   bg: "bg-gray-500",   text: "text-white", border: "border-l-gray-500" },
  expert:   { label: "Expert",   bg: "bg-green-500",  text: "text-white", border: "border-l-green-500" },
};

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  suspended: boolean;
  location: LudiLocation;
  createdAt: string;
}

export interface GameDTO {
  id: string;
  bggId?: string | null;
  name: string;
  type: string;
  category: GameCategory;
  summary?: string | null;
  minAge?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  duration?: number | null;
  coverUrl?: string | null;
  barcode?: string | null;
  status: GameStatus;
  location: LudiLocation;
  addedAt: string;
  averageRating?: number | null;
  ratingsCount?: number;
}

export interface LoanDTO {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  gameCoverUrl?: string | null;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string | null;
  extendedCount: number;
  userName?: string;
  userEmail?: string;
}

export interface UserAdminDTO {
  id: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  matricule?: string | null;
  nickname?: string | null;
  visibleInMembers?: boolean;
  role: Role;
  suspended: boolean;
  emailVerified: boolean;
  location: LudiLocation;
  createdAt: string;
  totalLoans: number;
  activeLoans: number;
  lateReturns: number;
}

export interface GameSessionDTO {
  id: string;
  name: string;
  date: string;
  location: string;
  startTime: string;
  imageUrl?: string | null;
  info?: string | null;
  createdAt: string;
  registrationCount: number;
  myRegistration?: GameSessionRegistrationDTO | null;
}

export interface GameSessionRegistrationDTO {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userNickname?: string | null;
  guestName?: string | null;
  registeredAt: string;
}

export interface MemberDTO {
  id: string;
  nickname: string;
  totalLoans: number;
  visibleInMembers?: boolean;
}

export interface UserNotificationDTO {
  id: string;
  type: "SESSION_INVITE" | "SESSION_REMINDER" | "LOAN_REMINDER";
  title: string;
  message: string;
  sessionId?: string | null;
  loanId?: string | null;
  createdAt: string;
}

export interface RatingDTO {
  id: string;
  userId: string;
  userName: string;
  gameId: string;
  stars: number;
  comment?: string | null;
  createdAt: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: Array<{ name: string; reason: string }>;
}

export interface ApiError {
  error: string;
}
