import React, { useState, useEffect, useCallback, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile, exists } from "@tauri-apps/plugin-fs";

import {
  AreaHighlight,
  Highlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
  Tip,
} from "./react-pdf-highlighter";
import type {
  Content,
  IHighlight,
  NewHighlight,
  ScaledPosition,
} from "./react-pdf-highlighter";

import { Sidebar } from "./Sidebar";
import { Spinner } from "./Spinner";
import { PdfLibrary } from "./components/PdfLibrary";
import { testHighlights as _testHighlights } from "./test-highlights";
import { databaseService, type PdfRecord } from "./services/database";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PdfOverlayProvider } from "./contexts/PdfOverlayContext";

import "./style/App.css";
import "../../dist/style.css";
import "./style/TagChip.css";
import "./style/TagModal.css";
import "./style/TagAutocomplete.css";
import "./style/HighlightContextMenu.css";
import "./style/CommentEditModal.css";
import "./style/PdfOverlay.css";

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () => {
  const hash = document.location.hash.slice("#highlight-".length);
  console.log("🔗 Parsing ID from hash:", document.location.hash, "→", hash);
  return hash;
};

const resetHash = () => {
  console.log("🔄 Resetting hash");
  document.location.hash = "";
};

const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480";

export function App() {
  const searchParams = new URLSearchParams(document.location.search);
  const initialUrl = searchParams.get("url") || PRIMARY_PDF_URL;

  const [appState, setAppState] = useState<'viewer' | 'library'>('viewer');
  const [url, setUrl] = useState(initialUrl);
  const [currentPdfId, setCurrentPdfId] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<Array<IHighlight>>(
    testHighlights[initialUrl] ? [...testHighlights[initialUrl]] : [],
  );

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      await databaseService.initialize();
    } catch (error) {
      console.error("Failed to initialize database:", error);
    }
  };

  const resetHighlights = () => {
    setHighlights([]);
  };

  const toggleDocument = () => {
    const newUrl =
      url === PRIMARY_PDF_URL ? SECONDARY_PDF_URL : PRIMARY_PDF_URL;
    setUrl(newUrl);
    setHighlights(testHighlights[newUrl] ? [...testHighlights[newUrl]] : []);
  };

  const openLocalFile = async () => {
    try {
      const filePath = await open({
        filters: [
          {
            name: "PDF Files",
            extensions: ["pdf"]
          }
        ]
      });
      
      if (filePath) {
        console.log("📂 User selected file:", filePath);
        
        // Normalize the path - Tauri dialog already returns absolute paths
        // but we'll ensure consistency by trimming any whitespace
        const normalizedPath = filePath.trim();
        console.log("📂 Normalized path:", normalizedPath);
        
        await openPdfFromPath(normalizedPath);
      }
    } catch (error) {
      console.error("❌ Error in openLocalFile:", error);
    }
  };

  const openPdfFromPath = async (filePath: string) => {
    console.log("🔍 Attempting to open PDF from path:", filePath);
    
    try {
      // First, check if the file exists
      console.log("📁 Checking if file exists...");
      const fileExists = await exists(filePath);
      console.log("📁 File exists:", fileExists);
      
      if (!fileExists) {
        console.warn("❌ File does not exist at path:", filePath);
        const fileName = filePath.split(/[\\/]/).pop() || "Unknown PDF";
        throw new Error(`File not found: ${fileName}`);
      }
      
      // Try to read the file
      console.log("📖 Reading file data...");
      const fileData = await readFile(filePath);
      console.log("📖 File data loaded, size:", fileData.length, "bytes");
      
      const blob = new Blob([fileData], { type: "application/pdf" });
      const fileUrl = URL.createObjectURL(blob);
      console.log("🔗 Created blob URL:", fileUrl);
      
      // Extract filename from path
      const fileName = filePath.split(/[\\/]/).pop() || "Unknown PDF";
      console.log("📝 Extracted filename:", fileName);
      
      // Check if PDF already exists in database
      console.log("🗄️ Checking database for existing PDF record...");
      let pdfRecord = await databaseService.getPdfByPath(filePath);
      
      if (!pdfRecord) {
        console.log("➕ Adding new PDF to database...");
        const pdfId = await databaseService.addPdf(fileName, filePath);
        pdfRecord = { id: pdfId, name: fileName, path: filePath, date_added: new Date().toISOString(), last_opened: new Date().toISOString() };
        console.log("✅ PDF added to database with ID:", pdfId);
      } else {
        console.log("🔄 Updating last opened time for existing PDF...");
        await databaseService.updatePdfLastOpened(pdfRecord.id);
        console.log("✅ Last opened time updated");
      }
      
      // Load existing highlights for this PDF
      console.log("🎨 Loading existing highlights...");
      const existingHighlights = await databaseService.getHighlightsForPdf(pdfRecord.id);
      console.log("🎨 Loaded", existingHighlights.length, "highlights");
      
      // Update application state
      setUrl(fileUrl);
      setCurrentPdfId(pdfRecord.id);
      setHighlights(existingHighlights);
      setAppState('viewer');
      console.log("✅ PDF opened successfully");
      
    } catch (error) {
      console.error("❌ Error opening PDF:", error);
      
      // Enhanced error handling
      const fileName = filePath.split(/[\\/]/).pop() || "Unknown PDF";
      let errorMessage = `Failed to open PDF: ${fileName}`;
      
      if (error instanceof Error) {
        if (error.message.includes("File not found") || error.message.includes("No such file")) {
          errorMessage = `PDF file "${fileName}" was not found at the expected location:\n\n${filePath}\n\nThe file may have been moved, renamed, or deleted.`;
        } else if (error.message.includes("Permission denied") || error.message.includes("Access denied")) {
          errorMessage = `Permission denied when trying to access PDF file:\n\n${fileName}\n\nPlease check that the application has permission to read this file.`;
        } else if (error.message.includes("sql")) {
          errorMessage = `Database error while processing PDF:\n\n${error.message}`;
        } else {
          errorMessage = `Error opening PDF "${fileName}":\n\n${error.message}`;
        }
      }
      
      console.error("💬 Showing error to user:", errorMessage);
      alert(errorMessage);
      
      // Try to find by name as fallback
      try {
        console.log("🔍 Searching for PDFs with same filename...");
        const pdfsByName = await databaseService.getPdfByName(fileName);
        if (pdfsByName.length > 0) {
          console.log("📚 Found", pdfsByName.length, "PDFs with same name in database");
        }
      } catch (dbError) {
        console.error("❌ Error searching database:", dbError);
      }
    }
  };

  const scrollViewerTo = useRef((highlight: IHighlight) => {});

  const scrollToHighlightFromHash = useCallback(() => {
    console.log("🎯 Attempting to scroll to highlight from hash");
    const highlightId = parseIdFromHash();
    console.log("🎯 Looking for highlight with ID:", highlightId);
    
    if (!highlightId) {
      console.log("❌ No highlight ID in hash");
      return;
    }
    
    const highlight = getHighlightById(highlightId);
    console.log("🎯 Found highlight:", highlight ? `Yes (${highlight.comment?.text})` : "No");
    
    if (highlight) {
      console.log("🎯 Scrolling to highlight, scrollViewerTo exists:", typeof scrollViewerTo.current === 'function');
      if (typeof scrollViewerTo.current === 'function') {
        scrollViewerTo.current(highlight);
        console.log("✅ Scroll function called");
      } else {
        console.log("❌ scrollViewerTo.current is not a function");
      }
    }
  }, [highlights]);

  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false);
    return () => {
      window.removeEventListener(
        "hashchange",
        scrollToHighlightFromHash,
        false,
      );
    };
  }, [scrollToHighlightFromHash]);

  const getHighlightById = (id: string) => {
    console.log("🔍 Searching for highlight with ID:", id, "in", highlights.length, "highlights");
    const found = highlights.find((highlight) => highlight.id === id);
    console.log("🔍 Search result:", found ? `Found: ${found.comment?.text}` : "Not found");
    return found;
  };

  const addHighlight = async (highlight: NewHighlight) => {
    console.log("Saving highlight", highlight);
    const newHighlight = { ...highlight, id: getNextId() };
    
    // Save to database if we have a current PDF
    if (currentPdfId) {
      try {
        console.log("📝 App: Saving highlight to database with ID:", newHighlight.id);
        await databaseService.addHighlight(currentPdfId, newHighlight);
        console.log("✅ App: Highlight saved to database successfully");
      } catch (error) {
        console.error("❌ App: Error saving highlight to database:", error);
        
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        alert(`Failed to save highlight to database: ${errorMessage}\n\nThe highlight will still appear in the current session, but tags may not work properly until the highlight is saved.`);
        
        // Note: We still add to React state so user doesn't lose their work
        // but they'll need to be aware that database operations might fail
      }
    } else {
      console.warn("⚠️ App: No current PDF ID set, highlight not saved to database");
      console.warn("⚠️ App: This means tag operations will fail for this highlight");
    }
    
    setHighlights((prevHighlights) => [
      newHighlight,
      ...prevHighlights,
    ]);
  };

  const updateHighlight = async (
    highlightId: string,
    position: Partial<ScaledPosition>,
    content: Partial<Content>,
  ) => {
    console.log("Updating highlight", highlightId, position, content);
    
    // Update in database
    if (currentPdfId) {
      try {
        await databaseService.updateHighlight(highlightId, position, content);
      } catch (error) {
        console.error("Error updating highlight in database:", error);
      }
    }
    
    setHighlights((prevHighlights) =>
      prevHighlights.map((h) => {
        const {
          id,
          position: originalPosition,
          content: originalContent,
          ...rest
        } = h;
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              ...rest,
            }
          : h;
      }),
    );
  };

  const updateHighlightComment = async (
    highlightId: string,
    commentText: string,
    commentEmoji: string,
  ) => {
    console.log("Updating highlight comment", highlightId, commentText, commentEmoji);
    
    // Update in database
    if (currentPdfId) {
      try {
        await databaseService.updateHighlightComment(highlightId, commentText, commentEmoji);
        console.log("Comment updated in database successfully");
      } catch (error) {
        console.error("Error updating comment in database:", error);
        throw error; // Re-throw to let the UI handle the error
      }
    }
    
    // Update in state
    setHighlights((prevHighlights) =>
      prevHighlights.map((h) => {
        return h.id === highlightId
          ? {
              ...h,
              comment: {
                text: commentText,
                emoji: commentEmoji,
              },
            }
          : h;
      }),
    );
  };

  // Navigation functions
  const showAllPdfs = () => {
    setAppState('library');
  };

  const backToViewer = () => {
    setAppState('viewer');
  };

  const openPdfFromLibrary = async (pdf: PdfRecord) => {
    console.log("📚 Opening PDF from library:", pdf.name, "at path:", pdf.path);
    try {
      await openPdfFromPath(pdf.path);
    } catch (error) {
      console.error("❌ Error opening PDF from library:", error);
      // The openPdfFromPath function already handles errors and shows appropriate messages
      // No need to show additional alert here
    }
  };

  if (appState === 'library') {
    return (
      <ThemeProvider>
        <PdfOverlayProvider>
          <PdfLibrary
            onOpenPdf={openPdfFromLibrary}
            onBackToViewer={backToViewer}
          />
        </PdfOverlayProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <PdfOverlayProvider>
        <div className="App" style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        highlights={highlights}
        resetHighlights={resetHighlights}
        toggleDocument={toggleDocument}
        openLocalFile={openLocalFile}
        showAllPdfs={showAllPdfs}
        onHighlightsUpdate={(updatedHighlights) => {
          // Refresh highlight tags when they're updated
          console.log('Highlights updated, refreshing sidebar');
        }}
        onUpdateComment={updateHighlightComment}
        currentPdfId={currentPdfId}
      />
      <div
        style={{
          height: "100vh",
          width: "75vw",
          position: "relative",
        }}
      >
        <PdfLoader url={url} beforeLoad={<Spinner />}>
          {(pdfDocument) => (
            <PdfHighlighter
              pdfDocument={pdfDocument}
              enableAreaSelection={(event) => event.altKey}
              onScrollChange={resetHash}
              scrollRef={(scrollTo) => {
                console.log("📜 PDF viewer scroll function registered");
                scrollViewerTo.current = scrollTo;
                scrollToHighlightFromHash();
              }}
              onSelectionFinished={(
                position,
                content,
                hideTipAndSelection,
                transformSelection,
              ) => (
                <Tip
                  onOpen={transformSelection}
                  onConfirm={(comment) => {
                    addHighlight({ content, position, comment });
                    hideTipAndSelection();
                  }}
                />
              )}
              highlightTransform={(
                highlight,
                index,
                setTip,
                hideTip,
                viewportToScaled,
                screenshot,
                isScrolledTo,
              ) => {
                const isTextHighlight = !highlight.content?.image;

                const component = isTextHighlight ? (
                  <Highlight
                    isScrolledTo={isScrolledTo}
                    position={highlight.position}
                    comment={highlight.comment}
                  />
                ) : (
                  <AreaHighlight
                    isScrolledTo={isScrolledTo}
                    highlight={highlight}
                    onChange={(boundingRect) => {
                      updateHighlight(
                        highlight.id,
                        { boundingRect: viewportToScaled(boundingRect) },
                        { image: screenshot(boundingRect) },
                      );
                    }}
                  />
                );

                return (
                  <Popup
                    popupContent={<HighlightPopup {...highlight} />}
                    onMouseOver={(popupContent) =>
                      setTip(highlight, (highlight) => popupContent)
                    }
                    onMouseOut={hideTip}
                    key={index}
                  >
                    {component}
                  </Popup>
                );
              }}
              highlights={highlights}
            />
          )}
        </PdfLoader>
      </div>
    </div>
      </PdfOverlayProvider>
    </ThemeProvider>
  );
}
