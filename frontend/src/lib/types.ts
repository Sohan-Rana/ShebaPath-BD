export interface Category {
  id: number;
  slug: string;
  name_bn: string;
  name_en: string;
  description_bn: string | null;
  description_en: string | null;
  icon: string | null;
  sort_order: number;
}

export interface ServiceListItem {
  id: number;
  slug: string;
  title_bn: string;
  title_en: string;
  summary_bn: string | null;
  summary_en: string | null;
  is_popular: boolean;
  last_verified_at: string | null;
  category: Category;
}

export interface ServiceDocument {
  id?: number;
  name_bn: string;
  name_en: string;
  note_bn?: string | null;
  note_en?: string | null;
  is_required: boolean;
  sort_order: number;
}
export interface ServiceStep {
  id?: number;
  step_number: number;
  title_bn: string;
  title_en: string;
  description_bn?: string | null;
  description_en?: string | null;
}
export interface ServiceFee {
  id?: number;
  label_bn: string;
  label_en: string;
  amount: string | null;
  currency: string;
  note_bn?: string | null;
  note_en?: string | null;
}
export interface ServiceSource {
  id?: number;
  title: string;
  url: string;
  authority?: string | null;
  is_official: boolean;
  verified_at?: string | null;
}

export interface ServiceDetail extends ServiceListItem {
  eligibility_bn: string | null;
  eligibility_en: string | null;
  authority_name: string | null;
  official_url: string | null;
  is_published: boolean;
  documents: ServiceDocument[];
  steps: ServiceStep[];
  fees: ServiceFee[];
  sources: ServiceSource[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  preferred_language: "bn" | "en";
  is_active: boolean;
  role_name: string;
  created_at: string;
}

export interface SavedService {
  id: number;
  service_id: number;
  created_at: string;
  service: ServiceListItem;
}

export interface Application {
  id: number;
  service_id: number | null;
  service_name: string;
  reference_number: string | null;
  submitted_on: string | null;
  expected_completion: string | null;
  status: string;
  notes: string | null;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceRef {
  title: string;
  url: string | null;
  verified_at: string | null;
  service_slug: string | null;
}
export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources: SourceRef[] | null;
  verified: boolean | null;
  created_at: string;
}
export interface ChatReply {
  session_id: string;
  message: ChatMessage;
  suggestions: string[];
}
export interface ChatSession {
  id: string;
  title: string;
  language: string;
  created_at: string;
  updated_at: string;
}
export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

export interface Analytics {
  users: number;
  new_users_7d: number;
  services: number;
  published_services: number;
  verified_services: number;
  unverified_services: number;
  unverified_sources: number;
  applications: number;
  chat_sessions: number;
  chat_messages: number;
  unanswered_questions: number;
  top_saved_services: { id: number; title_en: string; title_bn: string; saves: number }[];
}

export interface AdminLog {
  id: number;
  admin_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
