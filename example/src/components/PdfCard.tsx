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
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "1rem",
        margin: "0.5rem",
        cursor: "pointer",
        backgroundColor: "#fff",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        transition: "all 0.2s ease",
        minHeight: "120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
      }}
    >
      <div>
        <h3
          style={{
            margin: "0 0 0.5rem 0",
            fontSize: "1.1rem",
            fontWeight: "600",
            color: "#333",
            wordBreak: "break-word",
          }}
        >
          {pdf.name}
        </h3>
        <p
          style={{
            margin: "0 0 0.5rem 0",
            fontSize: "0.8rem",
            color: "#666",
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
              color: "#888",
              marginBottom: "0.25rem",
            }}
          >
            Last opened: {formatDate(pdf.last_opened)}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#007acc",
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
            color: "#dc3545",
            cursor: "pointer",
            padding: "0.25rem",
            borderRadius: "4px",
            fontSize: "1.2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8d7da";
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