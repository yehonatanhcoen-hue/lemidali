"use client";

import { useEffect } from "react";
import { IconX } from "./icons";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={title}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] anim-rise" style={{ animationDuration: "0.2s" }} onClick={onClose} />
      <div className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 shadow-xl anim-rise sm:max-w-lg sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink" aria-label="סגור">
            <IconX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
