import React, { useEffect, useRef } from "react";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Usability: close on Escape, like every other modal on the web.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Usability: click the dimmed backdrop to dismiss, without closing when
  // clicking inside the card itself.
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
    >
      <div
        ref={contentRef}
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-800 p-7 shadow-2xl shadow-black/50 animate-slideUp"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700/60 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;