import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
    >
      <div
        ref={contentRef}
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface p-7 shadow-2xl shadow-black/40 animate-slideUp"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-text-secondary transition-colors hover:bg-border-subtle hover:text-text-primary"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
