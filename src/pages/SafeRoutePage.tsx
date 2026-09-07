import { SafeRouteCalculator } from '../components/map/SafeRouteCalculator';
import { EvaluatorHeaderBanner } from '../components/ui/EvaluatorExplanationCard';

export default function SafeRoutePage() {
  return (
    <div className="space-y-6">
      <EvaluatorHeaderBanner
        pageTitle="Citizen Safe Evacuation Route Planner"
        description="Find, monitor, and navigate the safest available evacuation route from one location to another using an interactive, real-time map powered by OpenRouteService and live hazard monitoring."
        isEvaluatorMode={false}
        onToggleEvaluatorMode={() => {}}
      />

      <SafeRouteCalculator isAdmin={false} />
    </div>
  );
}
