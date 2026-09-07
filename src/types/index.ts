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

export type RoadStatus = 'operational' | 'vulnerable' | 'blocked' | 'damaged';

export interface Shelter {
  id: string;
  name: string;
  type: 'shelter' | 'evacuation_center' | 'assembly_point';
  district: string;
  state: string;
  capacity: number;
  currentOccupancy: number;
  status: 'open' | 'full' | 'closed';
  location: Location;
  contactNumber?: string;
  facilities: string[];
}

export interface Hospital {
  id: string;
  name: string;
  type: 'hospital' | 'medical_center' | 'primary_health_centre';
  district: string;
  state: string;
  bedCapacity: number;
  availableICUBeds: number;
  emergencyServices: boolean;
  status: 'operational' | 'busy' | 'restricted';
  location: Location;
  contactNumber?: string;
}

export interface EvacuationRoute {
  id: string;
  title: string;
  originName: string;
  destinationName: string;
  district: string;
  coordinates: [number, number][];
  distanceKm: number;
  estHours: number;
  status: 'published' | 'suspended' | 'draft';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  safetyRating: 'RECOMMENDED' | 'CAUTION' | 'WARNING';
  warnings: string[];
}

export interface RouteSafetyResult {
  routeStatus: 'NORMAL' | 'CAUTION' | 'WARNING' | 'BLOCKED' | 'NO_VERIFIED_SAFE_ROUTE';
  riskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationHours: number;
  blockedRoads: string[];
  dangerousSegments: string[];
  nearbyIncidents: string[];
  warnings: string[];
  alternativeAvailable: boolean;
  lastEvaluatedAt: string;
}

export interface AlternativeRouteOption {
  id: string;
  name: string;
  distanceKm: number;
  durationHours: number;
  riskCategory: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  routeStatus: 'NORMAL' | 'CAUTION' | 'WARNING' | 'BLOCKED';
  blockedCount: number;
  warningCount: number;
  summary: string;
  geometry: [number, number][];
  instructions?: { text: string; distance: number; duration: number; type: string }[];
  isRecommended: boolean;
  evaluatedAt: string;
}

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
  confidence?: number;
  dataSource?: string;
  modelVersion?: string;
  elevation?: number;
  rainfall_24h?: number;
  rainfall_72h?: number;
  rainfall_intensity?: number;
  data_sources?: Record<string, string>;
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
  evidenceUrl?: string;
  imageUrl?: string;
  timestamp: string;
  status: ReportStatus;
  evidenceAssessment: EvidenceAssessment;
  mediaAuthenticity: MediaAuthenticity;
  severity: RiskLevel;
  trustScore: number;
  aiConfidence: number;
  actionPriority: number;
  ai_analysis_status?: string;
  ai_model_name?: string;
  ai_model_version?: string;
  detected_labels?: any[];
  detectedLabels?: any[];
  predicted_hazard_type?: string;
  possibleHazardType?: string;
  hazard_confidence?: number;
  hazardConfidence?: number;
  image_relevance?: string;
  imageRelevance?: string;
  summaryMessage?: string;
  requires_human_review?: boolean;
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
  role: 'authority' | 'super_admin' | 'field_official' | 'citizen';
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
