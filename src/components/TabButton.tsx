import React from "react";

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

// Underline-style tab instead of the previous pill/scale treatment — reads
// calmer and more like a dashboard than a mobile app. Pair this with a
// `border-b border-zinc-800` on the parent tab bar for the rule the
// underline sits on.
const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
        isActive ? "text-amber-400" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {label}
      <span
        className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-amber-400 transition-opacity duration-150 ${
          isActive ? "opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
};

export default TabButton;