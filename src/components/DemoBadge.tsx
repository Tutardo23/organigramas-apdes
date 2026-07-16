import { FlaskConical } from "lucide-react";

export function DemoBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
      <FlaskConical className="h-3.5 w-3.5" />
      Entorno de demostración · datos ficticios
    </div>
  );
}
