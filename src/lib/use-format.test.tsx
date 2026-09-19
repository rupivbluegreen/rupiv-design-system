import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { DesignSystemProvider } from "../provider";
import { NO_VALUE } from "./format";
import { useFormat } from "./use-format";

function wrapper(locale: string, labels?: Record<string, string>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DesignSystemProvider locale={locale} labels={labels}>
        {children}
      </DesignSystemProvider>
    );
  };
}

describe("useFormat", () => {
  it("is English outside a provider", () => {
    const { result } = renderHook(() => useFormat());
    expect(result.current.locale).toBe("en");
    expect(result.current.date("2026-09-06")).toBe("6 Sept 2026");
    expect(result.current.duration(360)).toBe("6 min");
  });

  it("binds the provider's language to dates, and keeps Western digits and en-US grouping in numbers", () => {
    const en = renderHook(() => useFormat(), { wrapper: wrapper("en") }).result.current;
    const ar = renderHook(() => useFormat(), { wrapper: wrapper("ar") }).result.current;
    expect(en.locale).toBe("en");
    expect(ar.locale).toBe("ar");

    expect(en.date("2026-09-06")).toBe("6 Sept 2026");
    expect(ar.date("2026-09-06")).toBe("6 سبتمبر 2026");
    expect(en.date("2026-09-06", { calendar: "hijri" })).toBe("24 Rab. I 1448 AH");
    expect(ar.date("2026-09-06", { calendar: "hijri" })).toBe("24 ربيع الأول 1448 هـ");
    expect(en.dateBoth("2026-09-06")).toBe("6 Sept 2026 \u{00B7} 24 Rab. I 1448 AH");
    expect(ar.dateBoth("2026-09-06")).toBe("6 سبتمبر 2026 \u{00B7} 24 ربيع الأول 1448 هـ");

    for (const f of [en, ar]) {
      expect(f.num(1234.5)).toBe("1,234.5");
      expect(f.num(1234.5, 2)).toBe("1,234.50");
      expect(f.int(1234.5)).toBe("1,235");
      expect(f.pct(91)).toBe("91%");
      expect(f.ratio(0.912, 1)).toBe("91.2%");
      expect(f.formatNumber(1486)).toBe("1,486");
      expect(f.delta(-3.1)).toBe("\u{2212}3.1%");
      expect(f.time("2026-09-06T21:30:00Z")).toBe("00:30");
      expect(f.time(90)).toBe("01:30");
      expect(f.duration(144, "clock")).toBe("2:24");
      expect(f.num(null)).toBe(NO_VALUE);
      expect(f.date(null)).toBe(NO_VALUE);
    }
  });

  it("takes the unit of a duration in minutes from the provider labels", () => {
    const en = renderHook(() => useFormat(), { wrapper: wrapper("en") }).result.current;
    const ar = renderHook(() => useFormat(), { wrapper: wrapper("ar", { "duration.minuteShort": "د" }) }).result.current;
    expect(en.duration(360)).toBe("6 min");
    expect(ar.duration(360)).toBe("6 د");
    expect(ar.duration(360, "clock")).toBe("6:00");
  });

  it("is stable between renders while the language and labels do not change, and new when they do", () => {
    const { result, rerender } = renderHook(() => useFormat(), { wrapper: wrapper("en") });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);

    const changed = renderHook(() => useFormat(), { wrapper: wrapper("ar") });
    expect(changed.result.current).not.toBe(first);
  });
});
