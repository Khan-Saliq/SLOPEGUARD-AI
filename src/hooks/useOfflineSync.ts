import { useState, useEffect, useCallback } from 'react';
import type { CitizenReport, ProblemCategory, RiskLevel, Location } from '../types';

const OFFLINE_QUEUE_KEY = 'slopeguard_offline_reports_queue';

export interface SubmitReportInput {
  userId: string;
  userName: string;
  category: ProblemCategory;
  description: string;
  location: Location;
  gpsAccuracy?: number;
  severity: RiskLevel;
  evidenceAssessment: CitizenReport['evidenceAssessment'];
  mediaAuthenticity: CitizenReport['mediaAuthenticity'];
  aiConfidence: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [pendingReports, setPendingReports] = useState<CitizenReport[]>([]);

  // Load pending reports from localStorage
  const loadQueue = useCallback(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        setPendingReports(JSON.parse(stored));
      } else {
        setPendingReports([]);
      }
    } catch {
      setPendingReports([]);
    }
  }, []);

  useEffect(() => {
    loadQueue();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadQueue]);

  // Effective status
  const effectiveOnline = isOnline && !simulatedOffline;

  // Toggle offline simulation
  const toggleOfflineMode = () => {
    setSimulatedOffline(prev => !prev);
  };

  // Queue report when offline
  const saveReportOffline = (reportData: Partial<CitizenReport>): CitizenReport => {
    if (!reportData.userId || !reportData.userName || !reportData.category || !reportData.description || !reportData.location || !reportData.severity) {
      throw new Error('Offline reports require the authenticated user, hazard details, location, and severity.');
    }
    const offlineId = `OFFLINE-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const newReport: CitizenReport = {
      id: offlineId,
      userId: reportData.userId,
      userName: reportData.userName,
      category: reportData.category,
      description: reportData.description,
      location: reportData.location,
      gpsAccuracy: reportData.gpsAccuracy,
      severity: reportData.severity,
      evidenceAssessment: reportData.evidenceAssessment || 'insufficient',
      mediaAuthenticity: reportData.mediaAuthenticity || 'unknown',
      aiConfidence: reportData.aiConfidence || 0,
      trustScore: reportData.trustScore || 0,
      actionPriority: reportData.actionPriority || 0,
      status: 'pending_sync',
      timestamp: new Date().toISOString(),
    };

    const updatedQueue = [...pendingReports, newReport];
    setPendingReports(updatedQueue);
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
    } catch (err) {
      console.error('Failed to save report offline:', err);
    }
    return newReport;
  };

  // Sync pending reports
  const syncQueue = (submitCallback: (input: SubmitReportInput) => void) => {
    if (pendingReports.length === 0) return 0;

    let syncedCount = 0;
    pendingReports.forEach(report => {
      submitCallback({
        userId: report.userId,
        userName: report.userName,
        category: report.category,
        description: report.description,
        location: report.location,
        gpsAccuracy: report.gpsAccuracy,
        severity: report.severity,
        evidenceAssessment: report.evidenceAssessment,
        mediaAuthenticity: report.mediaAuthenticity,
        aiConfidence: report.aiConfidence,
      });
      syncedCount++;
    });

    // Clear local queue
    setPendingReports([]);
    try {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (err) {
      console.error('Failed to clear offline queue:', err);
    }

    return syncedCount;
  };

  return {
    isOnline: effectiveOnline,
    realOnlineState: isOnline,
    simulatedOffline,
    toggleOfflineMode,
    pendingReports,
    saveReportOffline,
    syncQueue,
  };
}
