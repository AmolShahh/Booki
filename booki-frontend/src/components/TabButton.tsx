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
      className={`px-6 py-2 rounded-t-lg transition-colors ${
        isActive
          ? "bg-red-500 text-white shadow-md"
          : "bg-gray-300 text-gray-700 hover:bg-gray-400"
      }`}
    >
      {label}
    </button>
  );
};

export default TabButton;
