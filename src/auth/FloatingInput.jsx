import { useState } from "react";

export default function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  error,
}) {
  const [focus, setFocus] = useState(false);

  const active = focus || value;

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onChange={onChange}
        className={`w-full h-12 px-3 pt-4 rounded-xl border
        ${error ? "border-red-400" : "border-slate-200"}
        focus:border-sky-500 outline-none`}
      />

      <label
        className={`absolute left-3 transition-all pointer-events-none
        ${
          active
            ? "top-1 text-xs text-sky-600"
            : "top-3 text-sm text-slate-400"
        }`}
      >
        {label}
      </label>
    </div>
  );
}