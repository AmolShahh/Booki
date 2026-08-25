import React from "react";

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
        isActive
          ? "bg-accent-bg text-accent"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
};

export default TabButton;
