import { Car, FileText, IdCard, Landmark, Map, Plane, Shield, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "id-card": IdCard,
  plane: Plane,
  car: Car,
  landmark: Landmark,
  map: Map,
  shield: Shield,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || FileText;
  return <Icon className={className} aria-hidden />;
}
