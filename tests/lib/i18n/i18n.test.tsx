import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageProvider, useI18n } from "@/lib/i18n";

function renderWithI18n(node: React.ReactNode) {
  return renderToStaticMarkup(<LanguageProvider>{node}</LanguageProvider>);
}

describe("LanguageProvider t() fallback chain", () => {
  it("resolves direct message keys", () => {
    function Test({ k }: { k: string }) {
      const { t } = useI18n();
      return <div>{t(k)}</div>;
    }
    const html = renderWithI18n(<Test k="common.spent" />);
    expect(html).toContain("Spent");
  });

  it("falls through to data.category.{key}", () => {
    function Test({ k }: { k: string }) {
      const { t } = useI18n();
      return <div>{t(k)}</div>;
    }
    const html = renderWithI18n(<Test k="health" />);
    expect(html).toContain("Health");
  });

  it("falls through to data.group.{key}", () => {
    function Test({ k }: { k: string }) {
      const { t } = useI18n();
      return <div>{t(k)}</div>;
    }
    const html = renderWithI18n(<Test k="wants" />);
    expect(html).toContain("Wants");
  });

  it("falls through to common.{key}", () => {
    function Test({ k }: { k: string }) {
      const { t } = useI18n();
      return <div>{t(k)}</div>;
    }
    const html = renderWithI18n(<Test k="spent" />);
    expect(html).toContain("Spent");
  });

  it("returns raw key when no message matches", () => {
    function Test({ k }: { k: string }) {
      const { t } = useI18n();
      return <div>{t(k)}</div>;
    }
    const html = renderWithI18n(<Test k="nonexistent.key.xyz" />);
    expect(html).toContain("nonexistent.key.xyz");
  });
});

describe("LanguageProvider formatDate", () => {
  it("formats ISO date string (yyyy-mm-dd)", () => {
    function Test() {
      const { formatDate } = useI18n();
      return <div>{formatDate("2024-01-15")}</div>;
    }
    const html = renderWithI18n(<Test />);
    expect(html).toContain("2024");
  });

  it("formats datetime string", () => {
    function Test() {
      const { formatDate } = useI18n();
      return <div>{formatDate("2024-06-15T12:00:00")}</div>;
    }
    const html = renderWithI18n(<Test />);
    expect(html).toContain("2024");
  });

  it("formats Date object", () => {
    function Test() {
      const { formatDate } = useI18n();
      return <div>{formatDate(new Date("2024-03-20"))}</div>;
    }
    const html = renderWithI18n(<Test />);
    expect(html).toContain("2024");
  });
});

describe("LanguageProvider formatNumber", () => {
  it("formats number with locale separators", () => {
    function Test() {
      const { formatNumber } = useI18n();
      return <div>{formatNumber(1000)}</div>;
    }
    const html = renderWithI18n(<Test />);
    expect(html).toContain("1,000");
  });

  it("respects formatting options", () => {
    function Test() {
      const { formatNumber } = useI18n();
      return <div>{formatNumber(1000.5, { maximumFractionDigits: 0 })}</div>;
    }
    const html = renderWithI18n(<Test />);
    expect(html).toContain("1,001");
  });
});

describe("useI18n", () => {
  it("throws when used outside LanguageProvider", () => {
    function Test() {
      useI18n();
      return null;
    }
    expect(() => {
      renderToStaticMarkup(<Test />);
    }).toThrow("useI18n must be used within LanguageProvider.");
  });
});
