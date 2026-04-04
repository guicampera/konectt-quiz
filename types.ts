
export enum ScoringSystem {
  CORRECT_WRONG = 'CORRECT_WRONG',
  POINTS = 'POINTS'
}

export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTI_CHOICE = 'MULTI_CHOICE',
  SCALE = 'SCALE',
  INFO_CARD = 'INFO_CARD',
  VIDEO = 'VIDEO',
  LOADING_SCREEN = 'LOADING_SCREEN',
  DATA_COLLECTION = 'DATA_COLLECTION'
}

export interface FormField {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'email' | 'tel';
  required: boolean;
}

export interface AnswerOption {
  id: string;
  label: string;
  value: number;
  icon?: string;
  imageUrl?: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  subtitle?: string;
  mediaUrl?: string;
  contentBody?: string;
  buttonText?: string;
  options?: AnswerOption[];
  fields?: FormField[];
  loadingText?: string[];
  required: boolean;
  layout?: 'list' | 'grid';
}

export interface QuizTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  cardColor: string;
  fontFamily: string;
  backgroundImage?: string;
  logoUrl?: string;
  logoHeight?: number;
  buttonRadius: 'none' | 'md' | 'full';
  fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
}

export interface TrackingConfig {
  facebookPixelId?: string;
  googleAnalyticsId?: string;
}

export interface QuizOutcome {
  id: string;
  minPercentage: number; // Agora baseado em porcentagem (0-100)
  title: string;
  subtitle?: string;
  mediaUrl?: string;
  contentBody?: string;
  buttonText: string;
  redirectUrl: string;
}

export interface Quiz {
  id: string;
  title: string;
  slug: string;
  description: string;
  questions: Question[];
  theme: QuizTheme;
  tracking: TrackingConfig;
  redirectUrl: string;
  webhookUrl?: string;
  showScore: boolean;
  scoringSystem: ScoringSystem;
  outcomes?: QuizOutcome[];
  active: boolean;
  createdAt: string;
  userId?: string;
}

export interface QuizResult {
  quizId: string;
  answers: Record<string, any>;
  score: number;
  totalCorrect?: number;
  totalQuestions?: number;
  durationSeconds?: number;
  completedAt: string;
}

export interface StepStats {
  questionId: string;
  views: number;
  dropOffs: number;
  completed: number;
  avgTime?: number;
}

export interface QuizStats {
  views: number;
  completions: number;
  avgTimeSeconds: number;
  conversionRate: number;
  funnel: StepStats[];
}

export interface User {
  id: string;
  email: string;
}
