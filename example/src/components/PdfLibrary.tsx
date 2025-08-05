import React, { useState, useEffect } from "react";
import { PdfCard } from "./PdfCard";
import { databaseService, type PdfRecord } from "../services/database";

interface PdfLibraryProps {
  onOpenPdf: (pdf: PdfRecord) => void;
  onBackToViewer: () => void;
}

export function PdfLibrary({ onOpenPdf, onBackToViewer }: PdfLibraryProps) {
  const [pdfs, setPdfs] = useState<(PdfRecord & { highlight_count: number })[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPdfs();
  }, []);

  const loadPdfs = async () => {
    try {
      setLoading(true);
      setError(null);
      const pdfList = await databaseService.getPdfsWithHighlightCounts();
      setPdfs(pdfList);
    } catch (err) {
      console.error("Error loading PDFs:", err);
      setError("Failed to load PDF library");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePdf = async (pdfId: number) => {
    try {
      await databaseService.deletePdf(pdfId);
      setPdfs(pdfs.filter(pdf => pdf.id !== pdfId));
    } catch (err) {
      console.error("Error deleting PDF:", err);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredPdfs = pdfs.filter(pdf =>
    pdf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pdf.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div>Loading your PDF library...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#dc3545" }}>
        <div>{error}</div>
        <button
          onClick={loadPdfs}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#007acc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#f8f9fa",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#333" }}>
            PDF Library
          </h1>
          <button
            onClick={onBackToViewer}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Back to Viewer
          </button>
        </div>

        {/* Search bar */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search PDFs by name or path..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.9rem",
            color: "#666",
          }}
        >
          {filteredPdfs.length} PDF{filteredPdfs.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* PDF Grid */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "1rem",
        }}
      >
        {filteredPdfs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "#666",
              fontSize: "1.1rem",
            }}
          >
            {searchQuery ? (
              <div>
                <p>No PDFs found matching "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#007acc",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div>
                <p>No PDFs in your library yet.</p>
                <p>Open a PDF file to automatically add it to your library.</p>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {filteredPdfs.map((pdf) => (
              <PdfCard
                key={pdf.id}
                pdf={pdf}
                onOpenPdf={onOpenPdf}
                onDeletePdf={handleDeletePdf}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}