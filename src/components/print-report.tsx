"use client";
import { Printer } from "@phosphor-icons/react";
export function PrintReport() {
  return (
    <button
      className="button button-secondary report-print"
      onClick={() => window.print()}
    >
      <Printer size={17} /> Print report
    </button>
  );
}
