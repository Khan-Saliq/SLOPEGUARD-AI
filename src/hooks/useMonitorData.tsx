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
  applyRiskToZone,
  computeActionPriority,
  jitter,
  recalcDistricts,
  severityToScore,
} from '../lib/riskEngine';
import type {
  Alert,
  CitizenReport,
  DistrictSummary,
  EmergencyTask,
  Notification,
  ProblemCategory,
  RiskLevel,
  RiskZone,
  Road,
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
  acknowledgeAlert: (id: string) => void;
  submitReport: (input: SubmitReportInput) => CitizenReport | Promise<any> | null;
  syncPendingReports: () => number;
  assignTask: (id: string, team: string) => void;
  updateTaskStatus: (id: string, status: EmergencyTask['status']) => void;
}

const MonitorDataContext = createContext<MonitorDataContextType | null>(null);

function maybeEscalateAlert(prev: Alert[], zones: RiskZone[]): Alert[] {
  const critical = zones.find(z => z.riskLevel === 'critical' && z.riskScore > 90);
  if (!critical || Math.random() > 0.15) return prev;
  if (prev.some(a => a.location.lat === critical.location.lat && !a.acknowledged)) return prev;

  const alert: Alert = {
    id: `a-live-${Date.now()}`,
    title: `Live Escalation — ${critical.name}`,
    message: `Risk score rose to ${critical.riskScore}. Sensor + rainfall convergence detected. Immediate review required.`,
    riskLevel: 'critical',
    district: critical.location.district,
    location: critical.location,
    timestamp: new Date().toISOString(),
    acknowledged: false,
    dataSource: 'sensor',
    affectedRoads: [],
    affectedVillages: [],
  };
  return [alert, ...prev].slice(0, 12);
}

export function MonitorDataProvider({ children }: { children: ReactNode }) {
  const [riskZones, setRiskZones] = useState<RiskZone[]>(INITIAL_INDIA_RISK_ZONES);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_INDIA_ALERTS);
  const [roads] = useState<Road[]>([]);
  const [villages] = useState<Village[]>([]);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>(INITIAL_CITIZEN_REPORTS);
  const [emergencyTasks, setEmergencyTasks] = useState<EmergencyTask[]>([]);
  const [weatherHistory, setWeatherHistory] = useState<WeatherData[]>(() => [{
    date: new Date().toISOString().split('T')[0],
    rainfall: 165,
    soilMoisture: 78,
    temperature: 22,
    humidity: 85,
  }]);
  const [riskTrend, setRiskTrend] = useState<RiskTrendPoint[]>([]);
  const [notifications] = useState<Notification[]>([]);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [tickCount, setTickCount] = useState(0);
  const [pendingSyncCount] = useState(0);

  // Derives district summaries dynamically from active risk zones
  const districts = useMemo(() => recalcDistricts(riskZones, []), [riskZones]);
  const { token } = useApp();

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    fetch('/api/risk-zones', { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setRiskZones(data);
      })
      .catch(() => {});
    fetch('/api/alerts', { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setAlerts(data);
      })
      .catch(() => {});
    fetch('/api/reports', { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setCitizenReports(data);
      })
      .catch(() => {});
  }, [token]);

  const liveTick = useCallback(() => {
    setRiskZones(prev => {
      const updated = prev.map(zone => {
        const rainfall = Math.round(jitter(zone.rainfall, 8, 20, 220));
        const soilMoisture = Math.round(jitter(zone.soilMoisture, 4, 25, 95));
        const satelliteIndicator = Math.round(jitter(zone.satelliteIndicator, 3, 10, 95));
        return applyRiskToZone({ ...zone, rainfall, soilMoisture, satelliteIndicator });
      });

      const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
      updated.forEach(z => { counts[z.riskLevel]++; });

      setRiskTrend(rt => [
        ...rt.slice(-23),
        {
          hour: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
          ...counts,
        },
      ]);
      setAlerts(a => maybeEscalateAlert(a, updated));

      return updated;
    });

    setWeatherHistory(prev => {
      const defaultLast: WeatherData = {
        date: new Date().toISOString().split('T')[0],
        rainfall: 150,
        soilMoisture: 75,
        temperature: 22,
        humidity: 85,
      };
      const last = prev && prev.length ? prev[prev.length - 1] : defaultLast;
      const next: WeatherData = {
        date: new Date().toISOString().split('T')[0],
        rainfall: Math.round(jitter(last.rainfall ?? defaultLast.rainfall, 12, 15, 220)),
        soilMoisture: Math.round(jitter(last.soilMoisture ?? defaultLast.soilMoisture, 5, 25, 95)),
        temperature: Math.round(jitter(last.temperature ?? defaultLast.temperature, 1.5, 14, 32)),
        humidity: Math.round(jitter(last.humidity ?? defaultLast.humidity, 4, 55, 98)),
      };
      return [...(prev || []).slice(-13), next];
    });

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
      acknowledgeAlert,
      submitReport,
      syncPendingReports,
      assignTask,
      updateTaskStatus,
    }),
    [
      riskZones,
      alerts,
      roads,
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
      acknowledgeAlert,
      submitReport,
      syncPendingReports,
      assignTask,
      updateTaskStatus,
    ],
  );

  return <MonitorDataContext.Provider value={value}>{children}</MonitorDataContext.Provider>;
}

export function useMonitorData() {
  const ctx = useContext(MonitorDataContext);
  if (!ctx) throw new Error('useMonitorData must be used within MonitorDataProvider');
  return ctx;
}
