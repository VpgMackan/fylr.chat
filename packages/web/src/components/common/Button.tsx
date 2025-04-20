import React from "react";
import { Button as HeadlessButton } from "@headlessui/react";

interface ButtonProps {
  text: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  id?: string;
  className?: string;
}

export default function Button({
  text,
  onClick,
  disabled = false,
  type = "button",
  id,
  className,
}: ButtonProps) {
  return (
    <HeadlessButton
      className={`border border-gray-300 rounded-lg py-2 px-4 text-2xl hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className || ""}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      id={id}
    >
      {text}
    </HeadlessButton>
  );
}
