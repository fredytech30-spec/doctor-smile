// User Types
export interface User {
  uid: string;
  prenom: string;
  nom: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  poste?: string;
  plan: 'standard' | 'professional' | 'enterprise';
  source?: string;
  profileComplete: boolean;
  trialStatus?: 'trial' | 'active' | 'expired';
  trialEnd?: Date | null;
  trialDays?: number;
  entreprise: Entreprise;
  emailVerified: boolean;
  createdAt: Date;
  lastLogin: Date;
}

// Entreprise Types
export interface Entreprise {
  nom: string;
  secteur: string;
  taille: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  pays: string;
  siret?: string | null;
}

// Abonnement Types
export interface Abonnement {
  plan: 'standard' | 'professional' | 'enterprise';
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  trialEnd?: Date | null;
  trialDays?: number;
  startedAt: Date;
  nextBilling?: Date | null;
  cancelledAt?: Date | null;
}

// Analysis Types
export interface Analysis {
  id: string;
  userId: string;
  entrepriseId: string;
  nom: string;
  type: 'bilan' | 'compte_resultat' | 'ratios' | 'complete';
  statut: 'pending' | 'processing' | 'completed' | 'failed';
  score?: number;
  progression?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  documents: Document[];
  resultats?: AnalysisResult;
}

export interface AnalysisResult {
  score: number;
  scoreSante: number;
  scoreRentabilite: number;
  scoreLiquidite: number;
  scoreSolvabilite: number;
  scoreCroissance: number;
  recommandations: Recommandation[];
  alertes: Alerte[];
  ratios: Ratio[];
}

export interface Document {
  id: string;
  nom: string;
  type: 'bilan' | 'compte_resultat' | 'annexe' | 'autre';
  format: 'pdf' | 'excel' | 'csv';
  taille: number;
  url: string;
  uploadedAt: Date;
  statut: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface Recommandation {
  id: string;
  type: 'amelioration' | 'alerte' | 'opportunite';
  categorie: string;
  titre: string;
  description: string;
  priorite: 'haute' | 'moyenne' | 'basse';
  impact: number;
}

export interface Alerte {
  id: string;
  type: 'danger' | 'avertissement' | 'info';
  categorie: string;
  titre: string;
  description: string;
  valeur: number;
  seuil: number;
}

export interface Ratio {
  id: string;
  nom: string;
  valeur: number;
  unite: string;
  tendance: 'hausse' | 'baisse' | 'stable';
  comparaison?: {
    secteur: number;
    difference: number;
  };
}

// Report Types
export interface Report {
  id: string;
  analysisId: string;
  userId: string;
  nom: string;
  type: 'pdf' | 'excel';
  format: 'standard' | 'detailed' | 'executive';
  statut: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  createdAt: Date;
  completedAt?: Date | null;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'analysis' | 'report' | 'alert' | 'system';
  titre: string;
  message: string;
  lu: boolean;
  createdAt: Date;
  actionUrl?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: string;
  poste?: string;
  plan?: string;
  entreprise: {
    nom: string;
    secteur: string;
    taille: string;
    pays: string;
    siret?: string;
  };
}

export interface AnalysisFormData {
  nom: string;
  type: 'bilan' | 'compte_resultat' | 'ratios' | 'complete';
  description?: string;
}

// Dashboard Types
export interface DashboardStats {
  totalAnalyses: number;
  analysesEnCours: number;
  analysesCompletees: number;
  scoreMoyen: number;
  documentsUploades: number;
  rapportsGeneres: number;
}

export interface KPICard {
  id: string;
  titre: string;
  valeur: number | string;
  variation?: number;
  tendance?: 'hausse' | 'baisse' | 'stable';
  unite?: string;
  couleur?: 'success' | 'warning' | 'error' | 'info';
}

// Chart Types
export interface ChartData {
  labels: string[];
  datasets: Dataset[];
}

export interface Dataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// Component Props Types
export interface ComponentSize {
  sm: string;
  md: string;
  lg: string;
}

export interface ComponentVariant {
  primary: string;
  secondary: string;
  ghost: string;
  danger: string;
}
