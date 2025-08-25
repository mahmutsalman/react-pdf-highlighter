import React, { useState, useEffect } from "react";
import { PdfCard } from "./PdfCard";
import { SortingDropdown, type SortOption } from "./SortingDropdown";
import { ThemeToggle } from "./ThemeToggle";
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
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem('pdf-library-sort');
    return (saved as SortOption) || 'lastOpened';
  });

  useEffect(() => {
    loadPdfs();
  }, [sortBy]);

  const loadPdfs = async () => {
    try {
      setLoading(true);
      setError(null);
      const sortMode = sortBy === 'name' ? 'name' : 'lastOpened';
      const pdfList = await databaseService.getPdfsWithHighlightCounts(sortMode);
      setPdfs(pdfList);
    } catch (err) {
      console.error("Error loading PDFs:", err);
      setError("Failed to load PDF library");
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    localStorage.setItem('pdf-library-sort', newSort);
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
      <div style={{ 
        padding: "2rem", 
        textAlign: "center",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div>Loading your PDF library...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: "2rem", 
        textAlign: "center", 
        color: "var(--danger-color)",
        backgroundColor: "var(--bg-primary)",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ marginBottom: "1rem" }}>{error}</div>
        <button
          onClick={loadPdfs}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "var(--accent-color)",
            color: "var(--bg-primary)",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--accent-color)";
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      backgroundColor: "var(--bg-primary)",
      color: "var(--text-primary)"
    }}>
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid var(--border-primary)",
          backgroundColor: "var(--bg-secondary)",
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
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text-primary)" }}>
            PDF Library
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ThemeToggle />
            <button
              onClick={onBackToViewer}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "var(--text-secondary)",
                color: "var(--bg-primary)",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--text-secondary)";
              }}
            >
              Back to Viewer
            </button>
          </div>
        </div>

        {/* Controls row with search and sorting */}
        <div style={{ 
          display: "flex", 
          gap: "12px", 
          alignItems: "flex-end", 
          marginBottom: "8px" 
        }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search PDFs by name or path..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border-primary)",
                borderRadius: "6px",
                fontSize: "1rem",
                boxSizing: "border-box",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-color)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-primary)";
              }}
            />
          </div>
          <SortingDropdown 
            value={sortBy}
            onChange={handleSortChange}
          />
        </div>

        <div
          style={{
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            {filteredPdfs.length} PDF{filteredPdfs.length !== 1 ? "s" : ""} found
          </span>
          <span style={{ fontSize: "0.8rem" }}>
            {sortBy === 'name' ? '📋 Static order' : '🕒 Recently opened first'}
          </span>
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
              color: "var(--text-secondary)",
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
                    backgroundColor: "var(--accent-color)",
                    color: "var(--bg-primary)",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--accent-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--accent-color)";
                  }}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div>
                <p>No PDFs in your library yet.</p>
                <p style={{ color: "var(--text-tertiary)" }}>
                  Open a PDF file to automatically add it to your library.
                </p>
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