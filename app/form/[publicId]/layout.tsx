"use client";

import type { ReactNode } from "react";

export default function PublicDateFormLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-date-form-route">
      {children}
      <style jsx global>{`
        .public-date-form-route a[href="/"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
