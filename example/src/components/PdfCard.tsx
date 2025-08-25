import React from "react";
import type { PdfRecord } from "../services/database";

interface PdfCardProps {
  pdf: PdfRecord & { highlight_count: number };
  onOpenPdf: (pdf: PdfRecord) => void;
  onDeletePdf: (pdfId: number) => void;
}

export function PdfCard({ pdf, onOpenPdf, onDeletePdf }: PdfCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOpenPdf = () => {
    onOpenPdf(pdf);
  };

  const handleDeletePdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove "${pdf.name}" from your library?`)) {
      onDeletePdf(pdf.id);
    }
  };

  return (
    <div
      className="pdf-card"
      onClick={handleOpenPdf}
      style={{
        border: "1px solid var(--border-primary)",
        borderRadius: "8px",
        padding: "1rem",
        margin: "0.5rem",
        cursor: "pointer",
        backgroundColor: "var(--bg-secondary)",
        boxShadow: "var(--card-shadow)",
        transition: "all 0.2s ease",
        minHeight: "120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--card-shadow-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--card-shadow)";
      }}
    >
      <div>
        <h3
          style={{
            margin: "0 0 0.5rem 0",
            fontSize: "1.1rem",
            fontWeight: "600",
            color: "var(--text-primary)",
            wordBreak: "break-word",
          }}
        >
          {pdf.name}
        </h3>
        <p
          style={{
            margin: "0 0 0.5rem 0",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            wordBreak: "break-all",
          }}
        >
          {pdf.path}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              marginBottom: "0.25rem",
            }}
          >
            Last opened: {formatDate(pdf.last_opened)}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--accent-color)",
              fontWeight: "500",
            }}
          >
            {pdf.highlight_count} highlight{pdf.highlight_count !== 1 ? "s" : ""}
          </div>
        </div>

        <button
          onClick={handleDeletePdf}
          style={{
            background: "none",
            border: "none",
            color: "var(--danger-color)",
            cursor: "pointer",
            padding: "0.25rem",
            borderRadius: "4px",
            fontSize: "1.2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Remove from library"
        >
          ×
        </button>
      </div>
    </div>
  );
}