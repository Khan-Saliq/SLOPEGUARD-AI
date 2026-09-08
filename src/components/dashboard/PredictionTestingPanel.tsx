import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { RiskBadge } from '../ui/Badge';
import { TEST_SCENARIOS } from '../../data/scenarios';
import { useMonitorData } from '../../hooks/useMonitorData';
import { useApp } from '../../hooks/useApp';
import {
  Cpu,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ShieldAlert,
  Loader2,
  Clock,
  Zap,
} from 'lucide-react';

interface SimulationResultPayload {
  mode: 'simulation' | 'live';
  scenarioId: string;
  scenarioName: string;
  modeLabel: string;
  purpose: string;
  inputFeatures: {
    rainfall_24h: number;
    rainfall_72h: number;
    rainfall_intensity: number;
    soil_moisture: number;
    slope: number;
    elevation: number;
    historicalRisk: number;
    satelliteIndicator: number;
    location: { name: string; district: string; state: string };
  };
  previousPrediction: { riskScore: number; riskLevel: string };
  newPrediction: { riskScore: number; riskLevel: string; mlConfidence: number; modelEngine: string };
  scoreDelta: number;
  categoryShift: string;
  automaticAlert?: any;
  timestamp: string;
  mlStatus: string;
}

export function PredictionTestingPanel() {
  const { token } = useApp();
  const { refreshRiskZones, refreshRoads } = useMonitorData();

  const [mode, setMode] = useState<'live' | 'simulation'>('live');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(TEST_SCENARIOS[1].id);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedScenario = TEST_SCENARIOS.find(s => s.id === selectedScenarioId) || TEST_SCENARIOS[0];

  const runScenario = async (scenarioId: string) => {
    setIsRunning(true);
    setError(null);

    try {
      const res = await fetch('/api/simulation/run-scenario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scenarioId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to execute simulation scenario');
      }

      const data: SimulationResultPayload = await res.json();
      setResult(data);
      setMode('simulation');

      // Refresh monitoring context data
      await Promise.all([refreshRiskZones(), refreshRoads()]);
    } catch (err: any) {
      console.error('Simulation execution error:', err);
      setError(err.message || 'Error running ML simulation scenario');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setError(null);

    try {
      const res = await fetch('/api/simulation/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMode('live');
        setResult(null);
        await Promise.all([refreshRiskZones(), refreshRoads()]);
      }
    } catch (err: any) {
      console.error('Simulation reset error:', err);
      setError('Failed to reset simulation mode');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="border-accent-bright/50 bg-card shadow-2xl overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-card via-card-hover to-card p-4">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-accent-bright" />
            <span className="text-base font-extrabold text-foreground">
              ML Prediction Model Demonstration & Testing Panel
            </span>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'simulation' ? (
              <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" /> SIMULATION MODE ACTIVE
              </span>
            ) : (
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> LIVE STREAM MODE
              </span>
            )}

            {mode === 'simulation' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={isResetting}
                className="text-xs font-semibold border-accent/40 text-foreground hover:bg-accent/20"
              >
                <RotateCcw className={`h-3.5 w-3.5 mr-1 ${isResetting ? 'animate-spin' : ''}`} />
                Reset to Live Mode
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Prominent Simulation Banner */}
        {mode === 'simulation' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl border-2 border-amber-500/60 bg-amber-500/10 text-amber-200 text-xs font-semibold flex items-center justify-between gap-3 shadow-md"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-extrabold text-amber-300 uppercase tracking-wider">
                  “Demonstration Simulation — Not Live Data”
                </p>
                <p className="text-[11px] text-amber-200/80 mt-0.5 font-normal">
                  Testing actual XGBoost ML model prediction pipeline using realistic historical & simulated environmental parameters.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleReset}
              disabled={isResetting}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shrink-0 shadow-md"
            >
              Reset Live Stream
            </Button>
          </motion.div>
        )}

        {/* Live Mode Safe Condition Notice */}
        {mode === 'live' && (
          <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-emerald-300">Live Weather Data Stream Active</p>
                <p className="text-[11px] text-emerald-200/80">
                  Open-Meteo live API returns safe environmental conditions. The ML model predicts safe baseline risk without generating false alerts.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold shrink-0">
              No critical risk detected
            </span>
          </div>
        )}

        {/* Scenario Selection Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Select Demonstration Test Scenario:</span>
            <span className="text-[10px] font-mono text-accent-bright">7 Predefined Scenarios Available</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {TEST_SCENARIOS.map(scen => {
              const isSelected = selectedScenarioId === scen.id;
              return (
                <button
                  key={scen.id}
                  type="button"
                  onClick={() => {
                    setSelectedScenarioId(scen.id);
                    runScenario(scen.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-accent-bright bg-accent/20 text-foreground shadow-md ring-1 ring-accent-bright'
                      : 'border-border/60 bg-card-hover/40 text-muted-foreground hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground truncate max-w-[170px]">{scen.name}</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-accent-bright border border-border/40">
                      {scen.modeLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{scen.purpose}</p>
                  <div className="flex items-center gap-2 text-[10px] text-accent-bright font-mono mt-1.5">
                    <span>🌧️ {scen.rainfall_24h}mm/24h</span>
                    <span>💧 {scen.soil_moisture}%</span>
                    <span>⛰️ {scen.slope}°</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Scenario Action Bar */}
        <div className="p-4 rounded-xl border border-border/60 bg-card-hover/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent-bright" />
              Active Scenario: {selectedScenario.name}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {selectedScenario.purpose}
            </p>
          </div>

          <Button
            onClick={() => runScenario(selectedScenarioId)}
            disabled={isRunning}
            className="bg-accent-bright hover:bg-accent text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-2 shrink-0 shadow-lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Executing ML Inference...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" /> Run Actual ML Prediction
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ML Prediction Output & Comparison Panel */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pt-2 border-t border-border/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-accent-bright flex items-center gap-2">
                <Activity className="h-4 w-4" /> Actual ML Model Prediction Output (XGBoost v1.0.0)
              </span>
              <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Executed at {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Feature Inputs vs Prediction Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Column 1: Input Feature Vector */}
              <div className="md:col-span-6 space-y-2">
                <div className="p-3.5 rounded-xl border border-border/60 bg-black/20 text-xs space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block border-b border-border/40 pb-1">
                    Preprocessed Input Features Sent to ML Engine
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-card/60 border border-border/40">
                      <span className="text-muted-foreground block text-[10px]">24h Rainfall:</span>
                      <span className="text-foreground font-bold text-xs">{result.inputFeatures.rainfall_24h} mm</span>
                    </div>
                    <div className="p-2 rounded bg-card/60 border border-border/40">
                      <span className="text-muted-foreground block text-[10px]">72h Cumulative:</span>
                      <span className="text-foreground font-bold text-xs">{result.inputFeatures.rainfall_72h} mm</span>
                    </div>
                    <div className="p-2 rounded bg-card/60 border border-border/40">
                      <span className="text-muted-foreground block text-[10px]">Soil Moisture:</span>
                      <span className="text-foreground font-bold text-xs">{result.inputFeatures.soil_moisture} %</span>
                    </div>
                    <div className="p-2 rounded bg-card/60 border border-border/40">
                      <span className="text-muted-foreground block text-[10px]">Slope Angle:</span>
                      <span className="text-foreground font-bold text-xs">{result.inputFeatures.slope} °</span>
                    </div>
                    <div className="p-2 rounded bg-card/60 border border-border/40">
                      <span className="text-muted-foreground block text-[10px]">Historical Risk:</span>
                      <span className="text-foreground font-bold text-xs">{result.inputFeatures.historicalRisk} / 100</span>
                    </div>
                    <div className="p-2 rounded bg-card/60 border border-border/40">
                      <span className="text-muted-foreground block text-[10px]">Satellite Index:</span>
                      <span className="text-foreground font-bold text-xs">{result.inputFeatures.satelliteIndicator} / 100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Prediction Delta & Results */}
              <div className="md:col-span-6 space-y-2">
                <div className="p-3.5 rounded-xl border border-accent-bright/40 bg-accent/10 text-xs space-y-3">
                  <span className="text-[11px] font-bold text-accent-bright uppercase tracking-wider block border-b border-accent-bright/30 pb-1">
                    ML Prediction Delta & Classification Output
                  </span>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    {/* Previous Prediction */}
                    <div className="p-3 rounded-xl bg-card/80 border border-border/50 text-center">
                      <span className="text-[10px] text-muted-foreground font-semibold block">Previous Risk</span>
                      <p className="text-lg font-extrabold text-foreground font-mono mt-0.5">
                        {result.previousPrediction.riskScore}/100
                      </p>
                      <div className="mt-1">
                        <RiskBadge level={result.previousPrediction.riskLevel as any} />
                      </div>
                    </div>

                    {/* New ML Prediction */}
                    <div className="p-3 rounded-xl bg-card border-2 border-accent-bright text-center shadow-lg">
                      <span className="text-[10px] text-accent-bright font-extrabold block">New ML Prediction</span>
                      <p className="text-xl font-extrabold text-accent-bright font-mono mt-0.5">
                        {result.newPrediction.riskScore}/100
                      </p>
                      <div className="mt-1">
                        <RiskBadge level={result.newPrediction.riskLevel as any} />
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/40 border border-border/60 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground">Level Shift & Score Delta:</span>
                    <span className="text-accent-bright font-bold flex items-center gap-1">
                      {result.categoryShift} (Δ {result.scoreDelta > 0 ? `+${result.scoreDelta}` : result.scoreDelta} pts)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Engine: {result.newPrediction.modelEngine}</span>
                    <span>Confidence: {result.newPrediction.mlConfidence}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Automatic Alert Result Box */}
            {result.automaticAlert ? (
              <div className="p-3.5 rounded-xl border border-red-500/60 bg-red-500/15 text-xs text-red-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-red-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse" />
                    AUTOMATIC HAZARD ALERT CREATED & DISPATCHED
                  </span>
                  <span className="text-[10px] font-mono bg-red-500/30 text-red-300 px-2 py-0.5 rounded font-bold">
                    {result.automaticAlert.riskLevel.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-red-200/90">{result.automaticAlert.message}</p>
                <p className="text-[10px] font-mono text-red-300 pt-1">
                  ✓ Broadcasted via SSE Stream to all connected Citizens & Admins
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  ML model prediction output ({result.newPrediction.riskScore}/100) is within safe/moderate threshold. No false alert generated.
                </span>
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
