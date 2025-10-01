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
      className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
        isActive
          ? "bg-orange-500 text-white shadow-lg scale-105"
          : "bg-white text-gray-600 hover:bg-orange-100 hover:text-orange-600 border border-gray-200"
      }`}
    >
      {label}
    </button>
  );
};

export default TabButton;