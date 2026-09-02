export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export type ReportStatus =
  | 'submitted'
  | 'ai_checked'
  | 'under_review'
  | 'action_assigned'
  | 'pending_sync'
  | 'resolved';

export type EvidenceAssessment =
  | 'genuine'
  | 'likely_genuine'
  | 'suspicious'
  | 'insufficient';

export type MediaAuthenticity =
  | 'likely_original'
  | 'potentially_manipulated'
  | 'unknown';

export type ProblemCategory =
  | 'landslide'
  | 'road_blockage'
  | 'crack'
  | 'slope_movement'
  | 'water_seepage'
  | 'debris'
  | 'other';

export type RoadStatus = 'operational' | 'vulnerable' | 'blocked';

export type DataSource = 'ai_prediction' | 'sensor' | 'satellite' | 'citizen_report';

export interface Location {
  lat: number;
  lng: number;
  area?: string;
  city?: string;
  district: string;
  state: string;
}

export interface RiskZone {
  id: string;
  name: string;
  location: Location;
  riskLevel: RiskLevel;
  riskScore: number;
  rainfall: number;
  soilMoisture: number;
  slope: number;
  historicalRisk: number;
  satelliteIndicator: number;
  population: number;
  infrastructureCount: number;
  lastUpdated: string;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  riskLevel: RiskLevel;
  district: string;
  location: Location;
  timestamp: string;
  acknowledged: boolean;
  dataSource: DataSource;
  affectedRoads: string[];
  affectedVillages: string[];
}

export interface Road {
  id: string;
  name: string;
  status: RoadStatus;
  district: string;
  coordinates: [number, number][];
  lastReport?: string;
  riskLevel: RiskLevel;
}

export interface Village {
  id: string;
  name: string;
  district: string;
  population: number;
  location: Location;
  connectivityStatus: 'connected' | 'partial' | 'isolated';
  riskLevel: RiskLevel;
}

export interface CitizenReport {
  id: string;
  userId: string;
  userName: string;
  location: Location;
  gpsAccuracy?: number;
  category: ProblemCategory;
  description: string;
  mediaUrl?: string;
  timestamp: string;
  status: ReportStatus;
  evidenceAssessment: EvidenceAssessment;
  mediaAuthenticity: MediaAuthenticity;
  severity: RiskLevel;
  trustScore: number;
  aiConfidence: number;
  actionPriority: number;
}

export interface EmergencyTask {
  id: string;
  title: string;
  district: string;
  priority: number;
  riskLevel: RiskLevel;
  location: Location;
  affectedPopulation: number;
  connectivityImpact: string;
  assignedTeam?: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface WeatherData {
  date: string;
  rainfall: number;
  soilMoisture: number;
  temperature: number;
  humidity: number;
}

export interface DistrictSummary {
  name: string;
  state: string;
  totalZones: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  activeAlerts: number;
  blockedRoads: number;
  isolatedVillages: number;
  center: [number, number];
}

export interface User {
  id: string;
  name: string;
  role: 'authority' | 'field_official' | 'citizen';
  trustScore: number;
  district?: string;
  language: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: RiskLevel;
  timestamp: string;
  read: boolean;
  language: string;
}
