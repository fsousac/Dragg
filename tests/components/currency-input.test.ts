import { describe, expect, it } from "vitest";

import {
  createCurrencyInputChangeHandler,
  createCurrencyInputEditingHandler,
  formatCurrencyInputValue,
  getCurrencyInputValueFromRawValue,
} from "@/components/dashboard/form-inputs/currency-input";

describe("currency input helpers", () => {
  it.each([
    ["0,002", 0.02],
    ["0,025", 0.25],
    ["0,250", 2.5],
    ["2,500", 25],
  ])("moves typed digits through cents for %s", (rawValue, amount) => {
    expect(getCurrencyInputValueFromRawValue(rawValue)).toBe(amount);
  });

  it("formats amount with two decimal places and comma separator", () => {
    expect(formatCurrencyInputValue(0)).toBe("0,00");
    expect(formatCurrencyInputValue(25)).toBe("25,00");
  });

  it("treats an empty raw input as zero", () => {
    expect(getCurrencyInputValueFromRawValue("")).toBe(0);
  });

  it("normalizes invalid or negative display values to zero", () => {
    expect(formatCurrencyInputValue(Number.NaN)).toBe("0,00");
    expect(formatCurrencyInputValue(-10)).toBe("0,00");
  });

  it("passes parsed numeric values to the change handler", () => {
    let nextValue = 0;
    const handleChange = createCurrencyInputChangeHandler((value) => {
      nextValue = value;
    });

    handleChange({ target: { value: "0,025" } });

    expect(nextValue).toBe(0.25);
  });

  it("toggles editing state through focus and blur handlers", () => {
    let isEditing = false;
    const setIsEditing = (value: boolean) => {
      isEditing = value;
    };

    createCurrencyInputEditingHandler(setIsEditing, true)();
    expect(isEditing).toBe(true);

    createCurrencyInputEditingHandler(setIsEditing, false)();
    expect(isEditing).toBe(false);
  });
});
