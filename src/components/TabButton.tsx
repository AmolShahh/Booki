import React from "react";
import type { LucideIcon } from "lucide-react";

interface TabButtonProps {
  label: string;
  icon?: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon: Icon, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-3 ${
        isActive
          ? "bg-accent-bg text-accent"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      }`}
    >
      {Icon && <Icon size={15} strokeWidth={2} />}
      <span className={Icon ? "hidden sm:inline" : ""}>{label}</span>
    </button>
  );
};

export default TabButton;
