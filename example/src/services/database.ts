import Database from "@tauri-apps/plugin-sql";
import type { IHighlight, Content, ScaledPosition } from "../react-pdf-highlighter";

export interface PdfRecord {
  id: number;
  name: string;
  path: string;
  date_added: string;
  last_opened: string;
}

export interface HighlightRecord {
  id: number;
  pdf_id: number;
  highlight_id: string;
  content_text: string | null;
  content_image: string | null;
  comment_text: string | null;
  comment_emoji: string | null;
  position_data: string;
  page_number: number;
  created_at: string;
}

class DatabaseService {
  private db: Database | null = null;

  async initialize(): Promise<void> {
    if (!this.db) {
      this.db = await Database.load("sqlite:pdf_highlighter.db");
    }
  }

  async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  // PDF operations
  async addPdf(name: string, path: string): Promise<number> {
    await this.ensureInitialized();
    const result = await this.db!.execute(
      "INSERT INTO pdfs (name, path, date_added, last_opened) VALUES (?, ?, datetime('now'), datetime('now'))",
      [name, path]
    );
    return result.lastInsertId as number;
  }

  async getPdfByPath(path: string): Promise<PdfRecord | null> {
    await this.ensureInitialized();
    const result = await this.db!.select<PdfRecord[]>(
      "SELECT * FROM pdfs WHERE path = ? LIMIT 1",
      [path]
    );
    return result.length > 0 ? result[0] : null;
  }

  async getPdfByName(name: string): Promise<PdfRecord[]> {
    await this.ensureInitialized();
    const result = await this.db!.select<PdfRecord[]>(
      "SELECT * FROM pdfs WHERE name = ?",
      [name]
    );
    return result;
  }

  async getAllPdfs(): Promise<PdfRecord[]> {
    await this.ensureInitialized();
    const result = await this.db!.select<PdfRecord[]>(
      "SELECT * FROM pdfs ORDER BY last_opened DESC"
    );
    return result;
  }

  async updatePdfLastOpened(id: number): Promise<void> {
    await this.ensureInitialized();
    await this.db!.execute(
      "UPDATE pdfs SET last_opened = datetime('now') WHERE id = ?",
      [id]
    );
  }

  async deletePdf(id: number): Promise<void> {
    await this.ensureInitialized();
    await this.db!.execute("DELETE FROM pdfs WHERE id = ?", [id]);
  }

  // Highlight operations
  async addHighlight(pdfId: number, highlight: IHighlight): Promise<void> {
    await this.ensureInitialized();
    await this.db!.execute(
      `INSERT INTO highlights 
       (pdf_id, highlight_id, content_text, content_image, comment_text, comment_emoji, position_data, page_number, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        pdfId,
        highlight.id,
        highlight.content.text || null,
        highlight.content.image || null,
        highlight.comment?.text || null,
        highlight.comment?.emoji || null,
        JSON.stringify(highlight.position),
        highlight.position.pageNumber,
      ]
    );
  }

  async getHighlightsForPdf(pdfId: number): Promise<IHighlight[]> {
    await this.ensureInitialized();
    const result = await this.db!.select<HighlightRecord[]>(
      "SELECT * FROM highlights WHERE pdf_id = ? ORDER BY created_at DESC",
      [pdfId]
    );

    return result.map(this.highlightRecordToIHighlight);
  }

  async updateHighlight(
    highlightId: string,
    position: Partial<ScaledPosition>,
    content: Partial<Content>
  ): Promise<void> {
    await this.ensureInitialized();
    
    // Get current highlight to merge changes
    const current = await this.db!.select<HighlightRecord[]>(
      "SELECT * FROM highlights WHERE highlight_id = ? LIMIT 1",
      [highlightId]
    );

    if (current.length === 0) return;

    const currentHighlight = current[0];
    const currentPosition = JSON.parse(currentHighlight.position_data);
    const updatedPosition = { ...currentPosition, ...position };

    await this.db!.execute(
      `UPDATE highlights 
       SET content_text = ?, content_image = ?, position_data = ? 
       WHERE highlight_id = ?`,
      [
        content.text !== undefined ? content.text : currentHighlight.content_text,
        content.image !== undefined ? content.image : currentHighlight.content_image,
        JSON.stringify(updatedPosition),
        highlightId,
      ]
    );
  }

  async deleteHighlight(highlightId: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.execute("DELETE FROM highlights WHERE highlight_id = ?", [highlightId]);
  }

  async getHighlightCountForPdf(pdfId: number): Promise<number> {
    await this.ensureInitialized();
    const result = await this.db!.select<{ count: number }[]>(
      "SELECT COUNT(*) as count FROM highlights WHERE pdf_id = ?",
      [pdfId]
    );
    return result[0]?.count || 0;
  }

  private highlightRecordToIHighlight(record: HighlightRecord): IHighlight {
    return {
      id: record.highlight_id,
      content: {
        text: record.content_text || undefined,
        image: record.content_image || undefined,
      },
      comment: {
        text: record.comment_text || "",
        emoji: record.comment_emoji || "",
      },
      position: JSON.parse(record.position_data),
    };
  }

  // Utility methods
  async searchPdfs(query: string): Promise<PdfRecord[]> {
    await this.ensureInitialized();
    const result = await this.db!.select<PdfRecord[]>(
      "SELECT * FROM pdfs WHERE name LIKE ? OR path LIKE ? ORDER BY last_opened DESC",
      [`%${query}%`, `%${query}%`]
    );
    return result;
  }

  async getPdfsWithHighlightCounts(): Promise<(PdfRecord & { highlight_count: number })[]> {
    await this.ensureInitialized();
    const result = await this.db!.select<(PdfRecord & { highlight_count: number })[]>(
      `SELECT p.*, COALESCE(h.highlight_count, 0) as highlight_count
       FROM pdfs p
       LEFT JOIN (
         SELECT pdf_id, COUNT(*) as highlight_count
         FROM highlights
         GROUP BY pdf_id
       ) h ON p.id = h.pdf_id
       ORDER BY p.last_opened DESC`
    );
    return result;
  }
}

export const databaseService = new DatabaseService();