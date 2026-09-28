export type MaterialType = 'study_pdf' | 'course_syllabus' | 'practical_manual' | 'diagram';

export interface Subject {
  id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
  description: string;
  colorTheme: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan';
  syllabusOutline: string[];
  created_at: string;
}

export interface PracticalExperiment {
  exp_number: number;
  title: string;
  aim: string;
  apparatus: string[];
  theory: string;
  procedure: string[];
  precautions: string[];
}

export interface SyllabusModule {
  module_number: number;
  title: string;
  hours: number;
  topics: string[];
  textbooks: string[];
}

export interface MaterialSection {
  title: string;
  content: string;
  key_takeaways?: string[];
}

export interface MaterialPreviewContent {
  text?: string;
  pages?: number;
  diagram_url?: string;
  diagram_caption?: string;
  diagram_labels?: Array<{ label: string; x: number; y: number; description: string }>;
  sections?: MaterialSection[];
  experiments?: PracticalExperiment[];
  syllabus_modules?: SyllabusModule[];
}

export type MaterialSourceType = 'device_upload' | 'google_drive';

export interface StudyMaterial {
  id: string;
  subject_id: string;
  title: string;
  type: MaterialType;
  source_type?: MaterialSourceType;
  file_name: string;
  file_path: string;
  file_size: number; // in bytes
  file_extension: string;
  mime_type?: string;
  topics: string[];
  description: string;
  author_or_instructor: string;
  semester: number;
  is_starred: boolean;
  views_count: number;
  download_url?: string;
  file_blob_url?: string; // local preview object URL for immediate device uploads
  drive_file_id?: string; // Google Drive file ID
  drive_web_view_link?: string; // Google Drive web viewer link
  drive_download_link?: string; // Google Drive direct web content link
  storage_path?: string;
  preview_content?: MaterialPreviewContent;
  created_at: string;
  updated_at: string;
}

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret?: string;
  isConnected: boolean;
  userEmail?: string;
  userName?: string;
  userPhoto?: string;
  folderId?: string;
  lastTestedAt?: string;
  lastSyncedAt?: string;
}

export interface FilterOptions {
  searchQuery: string;
  selectedSubjectId: string | 'all';
  selectedType: MaterialType | 'all';
  selectedSemester: number | 'all';
  onlyStarred: boolean;
  sortBy: 'recent' | 'title' | 'views' | 'size';
}

export type ThemeMode = 'amoled' | 'light';

export interface GeminiAssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
