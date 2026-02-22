// src/components/ui/select.jsx
import React from "react";

export function Select({ children, value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="border rounded px-3 py-2 w-full"
    >
      {children}
    </select>
  );
}

export function SelectTrigger({ children }) {
  return <div className="select-trigger">{children}</div>;
}

export function SelectValue({ value }) {
  return <span className="select-value">{value}</span>;
}

export function SelectContent({ children }) {
  return <div className="select-content">{children}</div>;
}

export function SelectItem({ value, children }) {
  return <option value={value}>{children}</option>;
}