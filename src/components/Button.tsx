import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "success" | "danger" | "pill";
  className?: string;
}

const baseStyles =
  "px-5 py-2.5 rounded-full font-medium shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<string, string> = {
  primary: "bg-orange-500 text-white hover:bg-orange-600 hover:shadow-md active:scale-95",
  secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:shadow-md",
  success: "bg-green-500 text-white hover:bg-green-600 hover:shadow-md active:scale-95",
  danger: "bg-red-500 text-white hover:bg-red-600 hover:shadow-md active:scale-95",
  pill: "px-3 py-1 rounded-full text-sm",
};

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;