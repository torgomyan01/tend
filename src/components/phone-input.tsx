"use client";

import { useState } from "react";

export function formatArmenianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const localDigits = digits
    .replace(/^374/, "")
    .replace(/^0/, "")
    .slice(0, 8);

  if (!localDigits) {
    return "";
  }

  const operator = localDigits.slice(0, 2);
  const firstPart = localDigits.slice(2, 5);
  const secondPart = localDigits.slice(5, 8);

  return ["+374", operator, firstPart, secondPart]
    .filter(Boolean)
    .join(" ");
}

type PhoneInputProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
};

export function PhoneInput({ value, onValueChange, required }: PhoneInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const inputValue = value ?? internalValue;

  function handleChange(valueToFormat: string) {
    const formattedValue = formatArmenianPhone(valueToFormat);

    setInternalValue(formattedValue);
    onValueChange?.(formattedValue);
  }

  return (
    <input
      type="tel"
      name="phone"
      inputMode="tel"
      autoComplete="tel"
      value={inputValue}
      required={required}
      placeholder="+374 77 000 000"
      onChange={(event) => handleChange(event.target.value)}
      className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
    />
  );
}
