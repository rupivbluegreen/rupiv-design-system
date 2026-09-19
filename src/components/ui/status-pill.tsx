import type { Tone } from "../../lib/types";
import { Badge } from "./badge";

export interface StatusPillProps {
  /** The text shown, already in the reader's language. */
  status: string;
  /**
   * The colour. The design system knows no status names: the application maps its own statuses to a tone
   * (`createToneResolver` builds the function from a map) and passes the result.
   */
  tone: Tone;
  size?: "sm" | "md";
  className?: string | undefined;
}

export function StatusPill({ status, tone, size = "md", className }: StatusPillProps) {
  return (
    <Badge tone={tone} variant="soft" size={size} dot className={className}>
      {status}
    </Badge>
  );
}
