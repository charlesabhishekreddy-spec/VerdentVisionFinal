// src/components/ui/alert.jsx
import React from "react";

export function Alert({ variant = "default", children }) {
  const baseClasses = "border-l-4 p-4 rounded";
  const variants = {
    default: "border-gray-300 bg-gray-50 text-gray-800",
    destructive: "border-red-500 bg-red-50 text-red-800",
    success: "border-green-500 bg-green-50 text-green-800",
    warning: "border-yellow-500 bg-yellow-50 text-yellow-800"
  };
  
  return (
    <div className={`${baseClasses} ${variants[variant]}`}>
      {children}
    </div>
  );
}

export function AlertDescription({ children }) {
  return <p className="text-sm">{children}</p>;
}

export function AlertTitle({ children }) {
  return <strong className="block font-medium">{children}</strong>;
}