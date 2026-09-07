import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  computeActionPriority,
  recalcDistricts,
  severityToScore,
} from '../lib/riskEngine';
import type {
  Alert,
  CitizenReport,
  DistrictSummary,
  EmergencyTask,
  EvacuationRoute,
  Hospital,
  Notification,
  ProblemCategory,
  RiskLevel,
  RiskZone,
  Road,
  RoadStatus,
  Shelter,
  Village,
  WeatherData,
} from '../types';
import { useApp } from './useApp';

export const INITIAL_INDIA_RISK_ZONES: RiskZone[] = [
  {
    id: 'rz-cherrapunji',
    name: 'Cherrapunji Sohra Slope Cut',
    location: { lat: 25.27, lng: 91.73, area: 'Sohra Slope', city: 'Cherrapunji', district: 'East Khasi Hills', state: 'Meghalaya' },
    riskLevel: 'critical',
    riskScore: 92,
    rainfall: 210,
    soilMoisture: 88,
    slope: 48,
    historicalRisk: 95,
    satelliteIndicator: 85,
    population: 5600,
    infrastructureCount: 14,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-shillong-peak',
    name: 'Upper Shillong Highway Pass',
    location: { lat: 25.54, lng: 91.87, area: 'Elephant Falls Pass', city: 'Shillong', district: 'East Khasi Hills', state: 'Meghalaya' },
    riskLevel: 'critical',
    riskScore: 86,
    rainfall: 175,
    soilMoisture: 82,
    slope: 42,
    historicalRisk: 88,
    satelliteIndicator: 78,
    population: 8900,
    infrastructureCount: 22,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-guwahati-bypass',
    name: 'Kamrup Bypass Hill Corridor',
    location: { lat: 26.14, lng: 91.73, area: 'Jalukbari Cut', city: 'Guwahati', district: 'Kamrup Metropolitan', state: 'Assam' },
    riskLevel: 'high',
    riskScore: 78,
    rainfall: 145,
    soilMoisture: 74,
    slope: 38,
    historicalRisk: 75,
    satelliteIndicator: 70,
    population: 14200,
    infrastructureCount: 35,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-gangtok-ridge',
    name: 'Upper Gangtok Highway Cut',
    location: { lat: 27.33, lng: 88.61, area: 'Tashi View Ridge', city: 'Gangtok', district: 'Gangtok', state: 'Sikkim' },
    riskLevel: 'critical',
    riskScore: 89,
    rainfall: 190,
    soilMoisture: 85,
    slope: 52,
    historicalRisk: 92,
    satelliteIndicator: 80,
    population: 4300,
    infrastructureCount: 18,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-champhai-border',
    name: 'Champhai Mountain Border Cut',
    location: { lat: 23.47, lng: 93.32, area: 'Zokhawthar Pass', city: 'Champhai', district: 'Champhai', state: 'Mizoram' },
    riskLevel: 'high',
    riskScore: 74,
    rainfall: 130,
    soilMoisture: 68,
    slope: 44,
    historicalRisk: 70,
    satelliteIndicator: 65,
    population: 2800,
    infrastructureCount: 8,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-kohima-pass',
    name: 'Kohima Bypass Cliff Corridor',
    location: { lat: 25.67, lng: 94.10, area: 'Jotsoma Ridge', city: 'Kohima', district: 'Kohima', state: 'Nagaland' },
    riskLevel: 'high',
    riskScore: 76,
    rainfall: 140,
    soilMoisture: 72,
    slope: 46,
    historicalRisk: 80,
    satelliteIndicator: 68,
    population: 3600,
    infrastructureCount: 12,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-itanagar-hills',
    name: 'Itanagar Papum Pare Slope',
    location: { lat: 27.10, lng: 93.62, area: 'Ganga Lake Cut', city: 'Itanagar', district: 'Papum Pare', state: 'Arunachal Pradesh' },
    riskLevel: 'moderate',
    riskScore: 58,
    rainfall: 110,
    soilMoisture: 60,
    slope: 35,
    historicalRisk: 55,
    satelliteIndicator: 50,
    population: 5200,
    infrastructureCount: 15,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-imphal-valley',
    name: 'Imphal West Hill Edge',
    location: { lat: 24.81, lng: 93.93, area: 'Kangpokpi Border', city: 'Imphal', district: 'Imphal West', state: 'Manipur' },
    riskLevel: 'critical',
    riskScore: 84,
    rainfall: 165,
    soilMoisture: 80,
    slope: 41,
    historicalRisk: 85,
    satelliteIndicator: 75,
    population: 6700,
    infrastructureCount: 19,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-shimla-highway',
    name: 'Shimla Kinnaur NH-05 Corridor',
    location: { lat: 31.10, lng: 77.17, area: 'Taradevi Cut', city: 'Shimla', district: 'Shimla', state: 'Himachal Pradesh' },
    riskLevel: 'critical',
    riskScore: 91,
    rainfall: 195,
    soilMoisture: 86,
    slope: 54,
    historicalRisk: 94,
    satelliteIndicator: 88,
    population: 11200,
    infrastructureCount: 28,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-kedarnath-valley',
    name: 'Kedarnath Valley Rudraprayag Pass',
    location: { lat: 30.73, lng: 79.06, area: 'Gaurikund Highway', city: 'Rudraprayag', district: 'Rudraprayag', state: 'Uttarakhand' },
    riskLevel: 'critical',
    riskScore: 95,
    rainfall: 220,
    soilMoisture: 92,
    slope: 58,
    historicalRisk: 98,
    satelliteIndicator: 92,
    population: 3400,
    infrastructureCount: 11,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-wayanad-ghat',
    name: 'Wayanad Meppadi Hill Slope',
    location: { lat: 11.68, lng: 76.13, area: 'Chooralmala Cut', city: 'Meppadi', district: 'Wayanad', state: 'Kerala' },
    riskLevel: 'critical',
    riskScore: 94,
    rainfall: 215,
    soilMoisture: 90,
    slope: 50,
    historicalRisk: 96,
    satelliteIndicator: 89,
    population: 7800,
    infrastructureCount: 24,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rz-darjeeling-ridge',
    name: 'Darjeeling Toy Train Ridge Cut',
    location: { lat: 27.04, lng: 88.26, area: 'Hill Cart Road', city: 'Darjeeling', district: 'Darjeeling', state: 'West Bengal' },
    riskLevel: 'high',
    riskScore: 79,
    rainfall: 155,
    soilMoisture: 75,
    slope: 45,
    historicalRisk: 82,
    satelliteIndicator: 72,
    population: 9500,
    infrastructureCount: 21,
    lastUpdated: new Date().toISOString(),
  },
];

export const INITIAL_INDIA_ALERTS: Alert[] = [
  {
    id: 'a-1',
    title: 'EXTREME LANDSLIDE RISK — Wayanad Hill Corridor',
    message: 'Continuous heavy rainfall (215mm) and topsoil saturation (90%) trigger critical slope instability warning.',
    riskLevel: 'critical',
    district: 'Wayanad',
    location: { lat: 11.68, lng: 76.13, area: 'Chooralmala', city: 'Meppadi', district: 'Wayanad', state: 'Kerala' },
    timestamp: new Date().toISOString(),
    acknowledged: false,
    dataSource: 'sensor',
    affectedRoads: ['SH-29 Wayanad Ghat Road'],
    affectedVillages: ['Chooralmala Settlement', 'Mundakkai Village'],
  },
  {
    id: 'a-2',
    title: 'CRITICAL SLOPE FAILURE — Kedarnath NH-107 Pass',
    message: 'High precipitation and steep slope gradient (58°) breach critical risk threshold.',
    riskLevel: 'critical',
    district: 'Rudraprayag',
    location: { lat: 30.73, lng: 79.06, area: 'Gaurikund', city: 'Rudraprayag', district: 'Rudraprayag', state: 'Uttarakhand' },
    timestamp: new Date().toISOString(),
    acknowledged: false,
    dataSource: 'ai_prediction',
    affectedRoads: ['NH-107 Gaurikund Highway'],
    affectedVillages: ['Rambara Settlement', 'Sonprayag Outpost'],
  },
  {
    id: 'a-3',
    title: 'HIGH HAZARD WARNING — Cherrapunji Sohra Road',
    message: 'Extremely heavy rainfall (210mm) weakening steep mountain cuts along SH-5.',
    riskLevel: 'critical',
    district: 'East Khasi Hills',
    location: { lat: 25.27, lng: 91.73, area: 'Sohra', city: 'Cherrapunji', district: 'East Khasi Hills', state: 'Meghalaya' },
    timestamp: new Date().toISOString(),
    acknowledged: false,
    dataSource: 'satellite',
    affectedRoads: ['SH-5 Shillong-Sohra Highway'],
    affectedVillages: ['Nongriat Village', 'Mawsmai Settlement'],
  },
];

export const INITIAL_CITIZEN_REPORTS: CitizenReport[] = [
  {
    id: 'cr-101',
    userId: 'u-citizen-1',
    userName: 'Kynpham Lyngdoh',
    category: 'road_blockage',
    description: 'Massive slope debris and mudslide blocking SH-5 near Sohra curve. Emergency vehicles cannot pass.',
    location: { lat: 25.27, lng: 91.73, area: 'Sohra Slope', city: 'Cherrapunji', district: 'East Khasi Hills', state: 'Meghalaya' },
    gpsAccuracy: 6,
    severity: 'critical',
    status: 'submitted',
    evidenceAssessment: 'likely_genuine',
    mediaAuthenticity: 'likely_original',
    aiConfidence: 94,
    trustScore: 92,
    actionPriority: 90,
    timestamp: new Date().toISOString(),
  },
  {
    id: 'cr-102',
    userId: 'u-citizen-2',
    userName: 'Anil Sharma',
    category: 'landslide',
    description: 'Soil liquefaction and rockfall near Chooralmala tea estate bypass.',
    location: { lat: 11.68, lng: 76.13, area: 'Chooralmala', city: 'Meppadi', district: 'Wayanad', state: 'Kerala' },
    gpsAccuracy: 8,
    severity: 'critical',
    status: 'submitted',
    evidenceAssessment: 'likely_genuine',
    mediaAuthenticity: 'likely_original',
    aiConfidence: 96,
    trustScore: 95,
    actionPriority: 93,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'cr-103',
    userId: 'u-citizen-3',
    userName: 'Ramesh Singh Rawat',
    category: 'crack',
    description: 'Deep 15cm structural fissure expanding across asphalt lane on NH-107 Gaurikund pass.',
    location: { lat: 30.73, lng: 79.06, area: 'Gaurikund', city: 'Rudraprayag', district: 'Rudraprayag', state: 'Uttarakhand' },
    gpsAccuracy: 10,
    severity: 'high',
    status: 'submitted',
    evidenceAssessment: 'likely_genuine',
    mediaAuthenticity: 'likely_original',
    aiConfidence: 89,
    trustScore: 88,
    actionPriority: 82,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'cr-104',
    userId: 'u-citizen-4',
    userName: 'Tenzing Bhutia',
    category: 'slope_movement',
    description: 'Active retaining wall movement and minor falling rocks above Tashi Viewpoint.',
    location: { lat: 27.33, lng: 88.61, area: 'Tashi View', city: 'Gangtok', district: 'Gangtok', state: 'Sikkim' },
    gpsAccuracy: 5,
    severity: 'high',
    status: 'submitted',
    evidenceAssessment: 'likely_genuine',
    mediaAuthenticity: 'likely_original',
    aiConfidence: 91,
    trustScore: 90,
    actionPriority: 85,
    timestamp: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 'cr-105',
    userId: 'u-citizen-5',
    userName: 'Lalthan Mawia',
    category: 'water_seepage',
    description: 'Heavy water seepage gushing out of hill cutting along Champhai border highway.',
    location: { lat: 23.47, lng: 93.32, area: 'Zokhawthar', city: 'Champhai', district: 'Champhai', state: 'Mizoram' },
    gpsAccuracy: 7,
    severity: 'moderate',
    status: 'submitted',
    evidenceAssessment: 'likely_genuine',
    mediaAuthenticity: 'likely_original',
    aiConfidence: 86,
    trustScore: 84,
    actionPriority: 72,
    timestamp: new Date(Date.now() - 14400000).toISOString(),
  },
];

export const INITIAL_INDIA_ROADS: Road[] = [
  {
    id: 'road-sh29',
    name: 'SH-29 Wayanad Ghat Road',
    district: 'Wayanad',
    status: 'blocked',
    riskLevel: 'critical',
    lastReport: 'Chooralmala debris slide blocked both lanes',
    coordinates: [
      [11.65, 76.10],
      [11.68, 76.13],
      [11.72, 76.16],
    ],
  },
  {
    id: 'road-nh107',
    name: 'NH-107 Gaurikund Highway',
    district: 'Rudraprayag',
    status: 'damaged',
    riskLevel: 'critical',
    lastReport: 'Fissure along edge lane near Sonprayag',
    coordinates: [
      [30.68, 79.02],
      [30.73, 79.06],
      [30.77, 79.09],
    ],
  },
  {
    id: 'road-sh5',
    name: 'SH-5 Shillong-Sohra Highway',
    district: 'East Khasi Hills',
    status: 'vulnerable',
    riskLevel: 'high',
    lastReport: 'Water seepage and falling gravel on hairpin curve',
    coordinates: [
      [25.50, 91.85],
      [25.38, 91.78],
      [25.27, 91.73],
    ],
  },
  {
    id: 'road-nh5',
    name: 'NH-05 Shimla Kinnaur Highway',
    district: 'Shimla',
    status: 'vulnerable',
    riskLevel: 'critical',
    lastReport: 'Rockfall hazard active at Taradevi cut',
    coordinates: [
      [31.05, 77.12],
      [31.10, 77.17],
      [31.15, 77.22],
    ],
  },
  {
    id: 'road-nh31a',
    name: 'NH-31A Gangtok Corridor',
    district: 'Gangtok',
    status: 'operational',
    riskLevel: 'moderate',
    lastReport: 'Clear - regular monitoring',
    coordinates: [
      [27.28, 88.58],
      [27.33, 88.61],
      [27.38, 88.65],
    ],
  },
];

export const INITIAL_INDIA_SHELTERS: Shelter[] = [
  {
    id: 'sh-1',
    name: 'Wayanad Central Relief Camp',
    type: 'evacuation_center',
    district: 'Wayanad',
    state: 'Kerala',
    capacity: 500,
    currentOccupancy: 185,
    status: 'open',
    location: { lat: 11.65, lng: 76.14, area: 'Meppadi Town Center', district: 'Wayanad', state: 'Kerala' },
    contactNumber: '+91 4936 202100',
    facilities: ['Emergency Power', 'Clean Water', 'Medical First Aid', 'Food Supplies'],
  },
  {
    id: 'sh-2',
    name: 'Gaurikund Emergency Transit Hub',
    type: 'assembly_point',
    district: 'Rudraprayag',
    state: 'Uttarakhand',
    capacity: 350,
    currentOccupancy: 120,
    status: 'open',
    location: { lat: 30.65, lng: 79.03, area: 'Sonprayag Helipad Complex', district: 'Rudraprayag', state: 'Uttarakhand' },
    contactNumber: '+91 1364 233112',
    facilities: ['Thermal Blankets', 'Oxygen Support', 'Satellite Phone Link'],
  },
  {
    id: 'sh-3',
    name: 'Sohra Community Evacuation Refuge',
    type: 'shelter',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    capacity: 400,
    currentOccupancy: 90,
    status: 'open',
    location: { lat: 25.30, lng: 91.75, area: 'Sohra Higher Secondary Campus', district: 'East Khasi Hills', state: 'Meghalaya' },
    contactNumber: '+91 364 2223400',
    facilities: ['Dry Ration Packs', 'Dormitory Sleeping Pads', 'Emergency Wireless'],
  },
];

export const INITIAL_INDIA_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-1',
    name: 'Meppadi District Emergency Hospital',
    type: 'hospital',
    district: 'Wayanad',
    state: 'Kerala',
    bedCapacity: 150,
    availableICUBeds: 18,
    emergencyServices: true,
    status: 'operational',
    location: { lat: 11.66, lng: 76.12, area: 'Meppadi Bypass', district: 'Wayanad', state: 'Kerala' },
    contactNumber: '+91 4936 204555',
  },
  {
    id: 'hosp-2',
    name: 'Rudraprayag Civil Hospital',
    type: 'hospital',
    district: 'Rudraprayag',
    state: 'Uttarakhand',
    bedCapacity: 90,
    availableICUBeds: 8,
    emergencyServices: true,
    status: 'operational',
    location: { lat: 30.62, lng: 78.98, area: 'Rudraprayag Main Road', district: 'Rudraprayag', state: 'Uttarakhand' },
    contactNumber: '+91 1364 233201',
  },
  {
    id: 'hosp-3',
    name: 'Shillong Civil Medical Center',
    type: 'hospital',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    bedCapacity: 280,
    availableICUBeds: 34,
    emergencyServices: true,
    status: 'operational',
    location: { lat: 25.57, lng: 91.88, area: 'Laban Hill', district: 'East Khasi Hills', state: 'Meghalaya' },
    contactNumber: '+91 364 2226341',
  },
];

export const INITIAL_INDIA_EVACUATION_ROUTES: EvacuationRoute[] = [
  {
    id: 'er-1',
    title: 'Wayanad Ghat Evacuation Corridor A',
    originName: 'Chooralmala Slope Danger Zone',
    destinationName: 'Meppadi Central Shelter',
    district: 'Wayanad',
    coordinates: [
      [11.68, 76.13],
      [11.67, 76.135],
      [11.65, 76.14],
    ],
    distanceKm: 4.8,
    estHours: 0.25,
    status: 'published',
    createdBy: 'Wayanad Emergency Command',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    safetyRating: 'CAUTION',
    warnings: ['Drive slowly near river crossing', 'Bypass single-lane debris area'],
  },
  {
    id: 'er-2',
    title: 'Kedarnath Valley North Refuge Route',
    originName: 'Gaurikund Cut',
    destinationName: 'Sonprayag Helipad Transit Camp',
    district: 'Rudraprayag',
    coordinates: [
      [30.73, 79.06],
      [30.70, 79.04],
      [30.65, 79.03],
    ],
    distanceKm: 11.2,
    estHours: 0.45,
    status: 'published',
    createdBy: 'Rudraprayag Disaster Cell',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    safetyRating: 'CAUTION',
    warnings: ['Active fissure on right shoulder at KM 4.2', 'Controlled one-way traffic'],
  },
];

interface RiskTrendPoint {
  hour: string;
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

interface SubmitReportInput {
  userId: string;
  userName: string;
  category: ProblemCategory;
  description: string;
  location: CitizenReport['location'];
  gpsAccuracy?: number;
  severity: RiskLevel;
  evidenceAssessment: CitizenReport['evidenceAssessment'];
  mediaAuthenticity: CitizenReport['mediaAuthenticity'];
  aiConfidence: number;
}

interface MonitorDataContextType {
  riskZones: RiskZone[];
  alerts: Alert[];
  roads: Road[];
  shelters: Shelter[];
  hospitals: Hospital[];
  evacuationRoutes: EvacuationRoute[];
  villages: Village[];
  citizenReports: CitizenReport[];
  emergencyTasks: EmergencyTask[];
  weatherHistory: WeatherData[];
  riskTrend: RiskTrendPoint[];
  districts: DistrictSummary[];
  notifications: Notification[];
  lastUpdated: Date;
  tickCount: number;
  pendingSyncCount: number;
  isLoading: boolean;
  refreshRiskZones: () => Promise<void>;
  refreshRoads: () => Promise<void>;
  refreshShelters: () => Promise<void>;
  refreshHospitals: () => Promise<void>;
  refreshEvacuationRoutes: () => Promise<void>;
  acknowledgeAlert: (id: string) => void;
  submitReport: (input: SubmitReportInput) => CitizenReport | Promise<any> | null;
  syncPendingReports: () => number;
  assignTask: (id: string, team: string) => void;
  updateTaskStatus: (id: string, status: EmergencyTask['status']) => void;
  updateRoadStatus: (roadId: string, status: RoadStatus, reason?: string) => Promise<void>;
  publishEvacuationRoute: (route: Partial<EvacuationRoute>) => Promise<EvacuationRoute | null>;
  suspendEvacuationRoute: (routeId: string) => Promise<void>;
}

const MonitorDataContext = createContext<MonitorDataContextType | null>(null);

export const INITIAL_RISK_TREND: RiskTrendPoint[] = Array.from({ length: 12 }, (_, i) => {
  const h = (new Date().getHours() - (11 - i) * 2 + 24) % 24;
  return {
    hour: `${String(h).padStart(2, '0')}:00`,
    critical: i > 8 ? 4 : i > 4 ? 3 : 2,
    high: i > 8 ? 4 : i > 4 ? 3 : 2,
    moderate: 2,
    low: 2,
  };
});

export const INITIAL_WEATHER_HISTORY: WeatherData[] = Array.from({ length: 12 }, (_, i) => {
  const h = (new Date().getHours() - (11 - i) * 2 + 24) % 24;
  return {
    date: `2026-09-07T${String(h).padStart(2, '0')}:00:00.000Z`,
    rainfall: 65 + Math.round(Math.sin(i / 2) * 35),
    soilMoisture: 60 + Math.round(Math.cos(i / 2) * 22),
    temperature: 24,
    humidity: 78,
  };
});

export function MonitorDataProvider({ children }: { children: ReactNode }) {
  const [riskZones, setRiskZones] = useState<RiskZone[]>(INITIAL_INDIA_RISK_ZONES);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_INDIA_ALERTS);
  const [roads, setRoads] = useState<Road[]>(INITIAL_INDIA_ROADS);
  const [shelters, setShelters] = useState<Shelter[]>(INITIAL_INDIA_SHELTERS);
  const [hospitals, setHospitals] = useState<Hospital[]>(INITIAL_INDIA_HOSPITALS);
  const [evacuationRoutes, setEvacuationRoutes] = useState<EvacuationRoute[]>(INITIAL_INDIA_EVACUATION_ROUTES);
  const [villages] = useState<Village[]>([]);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>(INITIAL_CITIZEN_REPORTS);
  const [emergencyTasks, setEmergencyTasks] = useState<EmergencyTask[]>([]);
  const [weatherHistory] = useState<WeatherData[]>(INITIAL_WEATHER_HISTORY);
  const [riskTrend] = useState<RiskTrendPoint[]>(INITIAL_RISK_TREND);
  const [notifications] = useState<Notification[]>([]);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [tickCount, setTickCount] = useState(0);
  const [pendingSyncCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Derives district summaries dynamically from active risk zones
  const districts = useMemo(() => recalcDistricts(riskZones, []), [riskZones]);
  const { token, user } = useApp();

  const refreshRoads = useCallback(async () => {
    try {
      const r = await fetch('/api/roads');
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          setRoads(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch roads:', err);
    }
  }, []);

  const refreshShelters = useCallback(async () => {
    try {
      const r = await fetch('/api/shelters');
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          setShelters(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch shelters:', err);
    }
  }, []);

  const refreshHospitals = useCallback(async () => {
    try {
      const r = await fetch('/api/hospitals');
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          setHospitals(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch hospitals:', err);
    }
  }, []);

  const refreshEvacuationRoutes = useCallback(async () => {
    try {
      const r = await fetch('/api/evacuation-routes');
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          setEvacuationRoutes(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch evacuation routes:', err);
    }
  }, []);

  // Refresh risk zones with real environmental data and ML predictions
  const refreshRiskZones = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch('/api/risk-zones/refresh', { method: 'POST', headers });

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      const result = await response.json();
      if (result.zones && Array.isArray(result.zones)) {
        setRiskZones(result.zones);
        if (result.alerts && Array.isArray(result.alerts) && result.alerts.length > 0) {
          setAlerts(prev => [...result.alerts, ...prev]);
        }
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error refreshing risk zones:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('/api/risk-zones', { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setRiskZones(data); })
      .catch(() => {});

    fetch('/api/alerts', { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setAlerts(data); })
      .catch(() => {});

    fetch('/api/reports', { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length) setCitizenReports(data); })
      .catch(() => {});

    refreshRoads();
    refreshShelters();
    refreshHospitals();
    refreshRiskZones();
  }, [token, user, refreshRiskZones, refreshRoads, refreshShelters, refreshHospitals, refreshEvacuationRoutes]);

  const updateRoadStatus = useCallback(async (roadId: string, status: RoadStatus, reason?: string) => {
    // Optimistic local state update
    setRoads(prev => prev.map(rd => rd.id === roadId ? { ...rd, status, lastReport: reason || rd.lastReport } : rd));

    if (token) {
      try {
        await fetch(`/api/roads/${roadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status, reason }),
        });
      } catch (err) {
        console.error('Failed to sync road status update:', err);
      }
    }
  }, [token]);

  const publishEvacuationRoute = useCallback(async (routeInput: Partial<EvacuationRoute>): Promise<EvacuationRoute | null> => {
    const newRoute: EvacuationRoute = {
      id: routeInput.id || `er-${Date.now()}`,
      title: routeInput.title || 'Official Evacuation Route',
      originName: routeInput.originName || 'Origin Area',
      destinationName: routeInput.destinationName || 'Evacuation Destination',
      district: routeInput.district || 'General',
      coordinates: routeInput.coordinates || [],
      distanceKm: routeInput.distanceKm || 0,
      estHours: routeInput.estHours || 0,
      status: 'published',
      createdBy: user?.name || 'Emergency Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      safetyRating: routeInput.safetyRating || 'RECOMMENDED',
      warnings: routeInput.warnings || [],
    };

    setEvacuationRoutes(prev => [newRoute, ...prev]);

    if (token) {
      try {
        const res = await fetch('/api/evacuation-routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(newRoute),
        });
        if (res.ok) {
          const created = await res.json();
          return created;
        }
      } catch (err) {
        console.error('Failed to persist published evacuation route:', err);
      }
    }
    return newRoute;
  }, [token, user]);

  const suspendEvacuationRoute = useCallback(async (routeId: string) => {
    setEvacuationRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: 'suspended' as const } : r));

    if (token) {
      try {
        await fetch(`/api/evacuation-routes/${routeId}/suspend`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Failed to suspend evacuation route:', err);
      }
    }
  }, [token]);

  const liveTick = useCallback(() => {
    setLastUpdated(new Date());
    setTickCount(c => c + 1);
  }, []);

  useEffect(() => {
    const id = setInterval(liveTick, 6000);
    return () => clearInterval(id);
  }, [liveTick]);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, acknowledged: true } : a)));
  }, []);

  const submitReport = useCallback(
    (input: SubmitReportInput) => {
      const severityScore = severityToScore(input.severity);
      const report: CitizenReport = {
        id: `cr-${Date.now()}`,
        userId: input.userId,
        userName: input.userName,
        location: input.location,
        gpsAccuracy: input.gpsAccuracy,
        category: input.category,
        description: input.description,
        timestamp: new Date().toISOString(),
        status: 'submitted',
        evidenceAssessment: input.evidenceAssessment,
        mediaAuthenticity: input.mediaAuthenticity,
        severity: input.severity,
        trustScore: 80,
        aiConfidence: input.aiConfidence,
        actionPriority: computeActionPriority(75, input.aiConfidence, severityScore, 80),
      };

      setCitizenReports(prev => [report, ...prev]);

      if (token) {
        fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(input),
        }).catch(() => {});
      }

      return report;
    },
    [token],
  );

  const syncPendingReports = useCallback(() => {
    return pendingSyncCount;
  }, [pendingSyncCount]);

  const assignTask = useCallback((id: string, team: string) => {
    setEmergencyTasks(prev => prev.map(t => (t.id === id ? { ...t, assignedTeam: team, status: 'in_progress' } : t)));
  }, []);

  const updateTaskStatus = useCallback((id: string, status: EmergencyTask['status']) => {
    setEmergencyTasks(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
  }, []);

  const value = useMemo(
    () => ({
      riskZones,
      alerts,
      roads,
      shelters,
      hospitals,
      evacuationRoutes,
      villages,
      citizenReports,
      emergencyTasks,
      weatherHistory,
      riskTrend,
      districts,
      notifications,
      lastUpdated,
      tickCount,
      pendingSyncCount,
      isLoading,
      refreshRiskZones,
      refreshRoads,
      refreshShelters,
      refreshHospitals,
      refreshEvacuationRoutes,
      acknowledgeAlert,
      submitReport,
      syncPendingReports,
      assignTask,
      updateTaskStatus,
      updateRoadStatus,
      publishEvacuationRoute,
      suspendEvacuationRoute,
    }),
    [
      riskZones,
      alerts,
      roads,
      shelters,
      hospitals,
      evacuationRoutes,
      villages,
      citizenReports,
      emergencyTasks,
      weatherHistory,
      riskTrend,
      districts,
      notifications,
      lastUpdated,
      tickCount,
      pendingSyncCount,
      isLoading,
      refreshRiskZones,
      refreshRoads,
      refreshShelters,
      refreshHospitals,
      refreshEvacuationRoutes,
      acknowledgeAlert,
      submitReport,
      syncPendingReports,
      assignTask,
      updateTaskStatus,
      updateRoadStatus,
      publishEvacuationRoute,
      suspendEvacuationRoute,
    ],
  );

  return <MonitorDataContext.Provider value={value}>{children}</MonitorDataContext.Provider>;
}

export function useMonitorData() {
  const ctx = useContext(MonitorDataContext);
  if (!ctx) throw new Error('useMonitorData must be used within MonitorDataProvider');
  return ctx;
}
