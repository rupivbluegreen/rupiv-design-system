import type { Tone } from "./types";

/**
 * Single source of truth for how every document/record status is colored.
 * Rule: tone encodes what the user must do, not the module.
 *  - neutral: nothing to do yet / archived
 *  - info:    moving, in someone else's hands
 *  - accent:  confirmed, committed
 *  - warning: needs attention soon
 *  - success: done, good
 *  - danger:  blocked, failed, overdue
 */
const STATUS_TONES: Record<string, Tone> = {
  // generic
  Draft: "neutral",
  Planned: "neutral",
  Cancelled: "neutral",
  Closed: "neutral",
  Expired: "neutral",
  Consumed: "neutral",

  // sales / purchase
  Sent: "info",
  Negotiation: "warning",
  Won: "success",
  Lost: "danger",
  Confirmed: "accent",
  "Partially dispatched": "warning",
  Dispatched: "info",
  Invoiced: "success",
  "Partially received": "warning",
  Received: "success",

  // inventory
  Available: "success",
  Reserved: "accent",
  "QC hold": "warning",
  Blocked: "danger",
  "In stock": "success",
  Packed: "accent",
  "In transit": "info",

  // goods receipt / quality
  "Pending QC": "warning",
  Accepted: "success",
  "Partially accepted": "warning",
  Rejected: "danger",
  Pending: "warning",
  Pass: "success",
  Conditional: "warning",
  Fail: "danger",

  // job work
  Issued: "info",
  "In process": "info",

  // dispatch
  Delivered: "success",
  Returned: "danger",

  // finance
  "Partially paid": "warning",
  Paid: "success",
  Overdue: "danger",
  Cleared: "success",
  Bounced: "danger",

  // GST returns / e-invoice (IRN) / e-way bill
  Filed: "success",
  "Not due": "neutral",
  Generated: "success",
  "Not generated": "warning",

  // priority
  Normal: "neutral",
  High: "warning",
  Urgent: "danger",
};

export function statusTone(status: string): Tone {
  return STATUS_TONES[status] ?? "neutral";
}

/** Grade → tone for fabric grading chips */
export function gradeTone(grade: string): Tone {
  switch (grade) {
    case "A":
      return "success";
    case "B":
      return "info";
    case "C":
      return "warning";
    default:
      return "danger";
  }
}
