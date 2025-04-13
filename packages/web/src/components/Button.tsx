import React from "react";

interface ButtonProps {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

export default function Button({
  text,
  onClick,
  disabled = false,
  type = "button",
  className,
}: ButtonProps) {
  return (
    <button
      className={`border border-gray-300 rounded-lg py-2 px-4 text-2xl hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className || ""}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {text}
    </button>
  );
}
