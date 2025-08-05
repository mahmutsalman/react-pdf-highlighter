import React, { useState, useEffect, useCallback, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

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

import "./style/App.css";
import "../../dist/style.css";

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
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
        await openPdfFromPath(filePath);
      }
    } catch (error) {
      console.error("Error opening file:", error);
    }
  };

  const openPdfFromPath = async (filePath: string) => {
    try {
      const fileData = await readFile(filePath);
      const blob = new Blob([fileData], { type: "application/pdf" });
      const fileUrl = URL.createObjectURL(blob);
      
      // Extract filename from path
      const fileName = filePath.split(/[\\/]/).pop() || "Unknown PDF";
      
      // Check if PDF already exists in database
      let pdfRecord = await databaseService.getPdfByPath(filePath);
      
      if (!pdfRecord) {
        // Add new PDF to database
        const pdfId = await databaseService.addPdf(fileName, filePath);
        pdfRecord = { id: pdfId, name: fileName, path: filePath, date_added: new Date().toISOString(), last_opened: new Date().toISOString() };
      } else {
        // Update last opened time
        await databaseService.updatePdfLastOpened(pdfRecord.id);
      }
      
      // Load existing highlights for this PDF
      const existingHighlights = await databaseService.getHighlightsForPdf(pdfRecord.id);
      
      setUrl(fileUrl);
      setCurrentPdfId(pdfRecord.id);
      setHighlights(existingHighlights);
      setAppState('viewer');
    } catch (error) {
      console.error("Error opening PDF:", error);
      
      // If file doesn't exist, try to find by name
      const fileName = filePath.split(/[\\/]/).pop() || "Unknown PDF";
      const pdfsByName = await databaseService.getPdfByName(fileName);
      
      if (pdfsByName.length > 0) {
        alert(`PDF file "${fileName}" was moved or deleted. Please locate it manually.`);
      }
    }
  };

  const scrollViewerTo = useRef((highlight: IHighlight) => {});

  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, []);

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
    return highlights.find((highlight) => highlight.id === id);
  };

  const addHighlight = async (highlight: NewHighlight) => {
    console.log("Saving highlight", highlight);
    const newHighlight = { ...highlight, id: getNextId() };
    
    // Save to database if we have a current PDF
    if (currentPdfId) {
      try {
        await databaseService.addHighlight(currentPdfId, newHighlight);
      } catch (error) {
        console.error("Error saving highlight to database:", error);
      }
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

  // Navigation functions
  const showAllPdfs = () => {
    setAppState('library');
  };

  const backToViewer = () => {
    setAppState('viewer');
  };

  const openPdfFromLibrary = async (pdf: PdfRecord) => {
    try {
      await openPdfFromPath(pdf.path);
    } catch (error) {
      // If file doesn't exist at the stored path, show error and ask user to locate it
      console.error("Error opening PDF from library:", error);
      alert(`PDF file "${pdf.name}" could not be found at "${pdf.path}". Please locate the file manually.`);
    }
  };

  if (appState === 'library') {
    return (
      <PdfLibrary
        onOpenPdf={openPdfFromLibrary}
        onBackToViewer={backToViewer}
      />
    );
  }

  return (
    <div className="App" style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        highlights={highlights}
        resetHighlights={resetHighlights}
        toggleDocument={toggleDocument}
        openLocalFile={openLocalFile}
        showAllPdfs={showAllPdfs}
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
  );
}
