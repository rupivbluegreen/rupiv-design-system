import { statusTone } from "@/lib/status";
import { Badge } from "./badge";

export interface StatusPillProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusPill({ status, size = "md", className }: StatusPillProps) {
  return (
    <Badge tone={statusTone(status)} variant="soft" size={size} dot className={className}>
      {status}
    </Badge>
  );
}
