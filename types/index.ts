export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  location?: LocationData;
  weather?: WeatherData;
  tides?: TideData;
  responseCategory?: FishingCategory;
}

export interface LocationData {
  lat: number;
  lng: number;
  name: string;
  state?: string;
  waterBody?: string;
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
  precise?: boolean;   // true when from browser geolocation, false when from manual entry
}

export interface WeatherData {
  temperatureF: number;
  windSpeedMph: number;
  windDirection: string;
  conditions: string;
  pressureInHg: number;
  pressureTrend: 'rising' | 'falling' | 'steady';
  humidity: number;
  cloudCoverPercent: number;
  uvIndex: number;
}

export interface TideData {
  currentHeight: number;
  currentTrend: 'incoming' | 'outgoing' | 'slack';
  nextHigh: TideEvent | null;
  nextLow: TideEvent | null;
  moonPhase: MoonPhase;
  stationName?: string;
}

export interface TideEvent {
  time: string;
  heightFt: number;
}

export type MoonPhase =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

export type FishingCategory =
  | 'bass'
  | 'tides'
  | 'weather'
  | 'lures'
  | 'technique'
  | 'location'
  | 'seasonal'
  | 'saltwater'
  | 'fly-fishing'
  | 'general'
  | 'greeting';

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface FishingContext {
  location?: LocationData;
  weather?: WeatherData;
  tides?: TideData;
  season?: Season;
  timeOfDay?: 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night';
  userQuery?: string;
}

export interface ChatApiRequest {
  message: string;
  conversationHistory?: Pick<Message, 'role' | 'content'>[];
  location?: LocationData;    // Client-supplied location (geolocation or manual entry)
  weatherMentioned?: boolean; // Whether the AI has mentioned weather in this chat already
  tidesMentioned?: boolean;   // Same for tides — used to gate first-mention nudges
}

export interface Chat {
  id: string;
  title: string;                    // "Sunday Jul 12 · New chat" or "Sunday Jul 12 · Wrightsville Redfish"
  createdAt: string;                // ISO 8601
  updatedAt: string;                // ISO 8601 — updated on every message
  messages: Message[];              // Persisted turn history (user + assistant only, no welcome)
  locationContext?: LocationData;   // Snapshot at time of chat creation
  weatherMentioned?: boolean;       // Tracks whether AI has mentioned weather in this chat
  tidesMentioned?: boolean;         // Same for tides
}

export interface ChatApiResponse {
  response: string;
  category: FishingCategory;
  contextUsed?: Partial<FishingContext>;
  error?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'APPEND_TO_MESSAGE'; payload: { id: string; chunk: string } }
  | { type: 'LOAD_MESSAGES'; payload: Message[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_MESSAGES' };

export interface ServiceStatus {
  name: string;
  status: 'connected' | 'mock' | 'error';
  label: string;
}
