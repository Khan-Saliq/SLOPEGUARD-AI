import { SafeRouteCalculator } from '../components/map/SafeRouteCalculator';
import { EvaluatorHeaderBanner } from '../components/ui/EvaluatorExplanationCard';
import { Card } from '../components/ui/Card';
import { useMonitorData } from '../hooks/useMonitorData';

export default function SafeRoutePage() {
  return (
    <div className="space-y-6">
      <EvaluatorHeaderBanner
        pageTitle="Safe Route Planner"
        description="Calculate safe emergency relief routes from any origin to any destination avoiding blocked highways and hazardous passes."
        isEvaluatorMode={false}
        onToggleEvaluatorMode={() => {}}
      />

      <Card>
        <div className="p-4">
          <SafeRouteCalculator roads={useMonitorData().roads} villages={useMonitorData().villages} />
        </div>
      </Card>
    </div>
  );
}
