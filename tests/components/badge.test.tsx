import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";

describe("Badge warning variant", () => {
  it("renders with theme-safe warning background and text classes", () => {
    const { container } = render(<Badge variant="warning">Paused</Badge>);
    const el = container.firstElementChild;
    expect(el?.className).toContain("bg-warning-bg");
    expect(el?.className).toContain("text-warning");
    expect(el?.className).not.toContain("bg-yellow");
  });
});
