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

export interface Tag {
  id: number;
  name: string;
  created_at: string;
}

export interface HighlightTag {
  highlight_id: string;
  tag_id: number;
}

class DatabaseService {
  private db: Database | null = null;

  async initialize(): Promise<void> {
    if (!this.db) {
      console.log('🏗️ DatabaseService: Initializing database connection...');
      this.db = await Database.load("sqlite:pdf_highlighter.db");
      console.log('✅ DatabaseService: Database connection established');
      
      // Verify table existence
      try {
        const tables = await this.db.select("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('📊 DatabaseService: Available tables:', tables.map((t: any) => t.name));
        
        // Check if our tag tables exist
        const tableNames = tables.map((t: any) => t.name);
        if (tableNames.includes('tags')) {
          console.log('✅ DatabaseService: Tags table exists');
        } else {
          console.log('❌ DatabaseService: Tags table missing!');
        }
        
        if (tableNames.includes('highlight_tags')) {
          console.log('✅ DatabaseService: Highlight_tags table exists');
        } else {
          console.log('❌ DatabaseService: Highlight_tags table missing!');
        }
      } catch (error) {
        console.error('❌ DatabaseService: Error checking tables:', error);
      }
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

  async updateHighlightComment(
    highlightId: string,
    commentText: string,
    commentEmoji: string
  ): Promise<void> {
    await this.ensureInitialized();
    await this.db!.execute(
      "UPDATE highlights SET comment_text = ?, comment_emoji = ? WHERE highlight_id = ?",
      [commentText, commentEmoji, highlightId]
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

  // Tag operations
  async addTag(name: string): Promise<number> {
    console.log('💾 DatabaseService: addTag called with name:', name);
    await this.ensureInitialized();
    try {
      console.log('💾 DatabaseService: Executing INSERT into tags table');
      const result = await this.db!.execute(
        "INSERT INTO tags (name) VALUES (?)",
        [name]
      );
      console.log('✅ DatabaseService: Tag inserted successfully with ID:', result.lastInsertId);
      return result.lastInsertId as number;
    } catch (error: any) {
      console.log('⚠️ DatabaseService: Error inserting tag. Full error object:', error);
      console.log('⚠️ DatabaseService: Error message:', error.message);
      console.log('⚠️ DatabaseService: Error toString:', error.toString());
      
      // Check for UNIQUE constraint failed in multiple ways
      const errorString = error.toString() || '';
      const errorMessage = error.message || '';
      const isUniqueConstraintError = 
        errorString.includes("UNIQUE constraint failed") || 
        errorMessage.includes("UNIQUE constraint failed") ||
        errorString.includes("constraint failed: tags.name") ||
        errorMessage.includes("constraint failed: tags.name");
      
      if (isUniqueConstraintError) {
        console.log('🔍 DatabaseService: Tag already exists (UNIQUE constraint), finding existing ID');
        try {
          const existing = await this.getTagByName(name);
          if (existing) {
            console.log('✅ DatabaseService: Found existing tag with ID:', existing.id);
            return existing.id;
          } else {
            console.log('❌ DatabaseService: Tag should exist but not found in getTagByName');
          }
        } catch (getError) {
          console.error('❌ DatabaseService: Error in getTagByName:', getError);
        }
      }
      
      console.error('❌ DatabaseService: Unhandled error in addTag:', error);
      throw error;
    }
  }

  async getTagByName(name: string): Promise<Tag | null> {
    console.log('🔍 DatabaseService: getTagByName called with:', name);
    await this.ensureInitialized();
    const result = await this.db!.select<Tag[]>(
      "SELECT * FROM tags WHERE name = ? LIMIT 1",
      [name]
    );
    console.log('🔍 DatabaseService: getTagByName query result:', result);
    const tag = result.length > 0 ? result[0] : null;
    console.log('🔍 DatabaseService: getTagByName returning:', tag);
    return tag;
  }

  async getAllTags(): Promise<Tag[]> {
    await this.ensureInitialized();
    const result = await this.db!.select<Tag[]>(
      "SELECT * FROM tags ORDER BY name ASC"
    );
    return result;
  }

  async getTagSuggestions(query: string, limit: number = 10): Promise<string[]> {
    await this.ensureInitialized();
    const searchPattern = `%${query}%`;
    const result = await this.db!.select<Tag[]>(
      "SELECT name FROM tags WHERE name LIKE ? ORDER BY name ASC LIMIT ?",
      [searchPattern, limit]
    );
    return result.map(tag => tag.name);
  }

  async deleteTag(tagId: number): Promise<void> {
    await this.ensureInitialized();
    // First remove all highlight-tag relationships
    await this.db!.execute("DELETE FROM highlight_tags WHERE tag_id = ?", [tagId]);
    // Then delete the tag
    await this.db!.execute("DELETE FROM tags WHERE id = ?", [tagId]);
  }

  async bulkDeleteTags(tagIds: number[]): Promise<void> {
    await this.ensureInitialized();
    
    if (tagIds.length === 0) return;
    
    // Create placeholders for the SQL IN clause
    const placeholders = tagIds.map(() => "?").join(",");
    
    try {
      // Start transaction for consistency
      await this.db!.execute("BEGIN TRANSACTION");
      
      // First remove all highlight-tag relationships for these tags
      await this.db!.execute(
        `DELETE FROM highlight_tags WHERE tag_id IN (${placeholders})`,
        tagIds
      );
      
      // Then delete the tags
      await this.db!.execute(
        `DELETE FROM tags WHERE id IN (${placeholders})`,
        tagIds
      );
      
      // Commit transaction
      await this.db!.execute("COMMIT");
    } catch (error) {
      // Rollback on error
      await this.db!.execute("ROLLBACK");
      throw error;
    }
  }

  async getTagsWithUsageCount(): Promise<{ tag: Tag; usageCount: number }[]> {
    await this.ensureInitialized();
    const result = await this.db!.select<(Tag & { usage_count: number })[]>(
      `SELECT t.*, COUNT(ht.highlight_id) as usage_count
       FROM tags t
       LEFT JOIN highlight_tags ht ON t.id = ht.tag_id
       GROUP BY t.id, t.name, t.created_at
       ORDER BY t.name ASC`
    );
    return result.map(row => ({
      tag: { id: row.id, name: row.name, created_at: row.created_at },
      usageCount: row.usage_count
    }));
  }

  // Helper method to check if highlight exists in database
  async highlightExists(highlightId: string): Promise<boolean> {
    console.log('🔍 DatabaseService: Checking if highlight exists:', highlightId);
    await this.ensureInitialized();
    try {
      const result = await this.db!.select<{ count: number }[]>(
        "SELECT COUNT(*) as count FROM highlights WHERE highlight_id = ?",
        [highlightId]
      );
      const exists = result[0]?.count > 0;
      console.log('🔍 DatabaseService: Highlight exists:', exists);
      
      // Additional debugging: show the actual highlight record if needed
      if (exists) {
        console.log('✅ DatabaseService: Highlight found in database');
      }
      
      return exists;
    } catch (error) {
      console.error('❌ DatabaseService: Error checking highlight existence:', error);
      return false;
    }
  }

  // Highlight-Tag relationship operations
  async addHighlightTag(highlightId: string, tagName: string): Promise<void> {
    console.log('🔗 DatabaseService: addHighlightTag called with:', highlightId, '←→', tagName);
    await this.ensureInitialized();
    
    // First, validate that the highlight exists in the database
    console.log('🔍 DatabaseService: Validating highlight exists in database');
    const highlightExistsInDb = await this.highlightExists(highlightId);
    
    if (!highlightExistsInDb) {
      const errorMessage = `Cannot add tag to highlight: Highlight with ID "${highlightId}" was not found in the database. This may happen if the highlight failed to save properly.`;
      console.error('❌ DatabaseService:', errorMessage);
      throw new Error(errorMessage);
    }
    
    console.log('✅ DatabaseService: Highlight exists in database, proceeding with tag relationship');
    
    // Ensure the tag exists
    console.log('💾 DatabaseService: Ensuring tag exists in database');
    const tagId = await this.addTag(tagName);
    console.log('✅ DatabaseService: Tag ID obtained:', tagId);
    
    // Then create the relationship (ignore if already exists)
    try {
      console.log('🔗 DatabaseService: Creating highlight-tag relationship');
      await this.db!.execute(
        "INSERT INTO highlight_tags (highlight_id, tag_id) VALUES (?, ?)",
        [highlightId, tagId]
      );
      console.log('✅ DatabaseService: Highlight-tag relationship created successfully');
    } catch (error: any) {
      console.log('⚠️ DatabaseService: Error creating relationship:', error);
      const errorString = error.toString() || '';
      const errorMessage = error.message || '';
      
      // Check for duplicate relationship (which is fine)
      const isDuplicateError = 
        errorString.includes("UNIQUE constraint failed") || 
        errorMessage.includes("UNIQUE constraint failed") ||
        errorString.includes("PRIMARY KEY") ||
        errorMessage.includes("PRIMARY KEY");
      
      if (isDuplicateError) {
        console.log('ℹ️ DatabaseService: Relationship already exists, ignoring');
      } else {
        console.error('❌ DatabaseService: Unexpected error creating relationship:', error);
        throw error;
      }
    }
  }

  async removeHighlightTag(highlightId: string, tagId: number): Promise<void> {
    await this.ensureInitialized();
    await this.db!.execute(
      "DELETE FROM highlight_tags WHERE highlight_id = ? AND tag_id = ?",
      [highlightId, tagId]
    );
  }

  async getHighlightTags(highlightId: string): Promise<Tag[]> {
    await this.ensureInitialized();
    const result = await this.db!.select<Tag[]>(
      `SELECT t.* FROM tags t
       INNER JOIN highlight_tags ht ON t.id = ht.tag_id
       WHERE ht.highlight_id = ?
       ORDER BY t.name ASC`,
      [highlightId]
    );
    return result;
  }

  async getHighlightsByTag(tagId: number, pdfId?: number): Promise<IHighlight[]> {
    await this.ensureInitialized();
    let query = `
      SELECT h.* FROM highlights h
      INNER JOIN highlight_tags ht ON h.highlight_id = ht.highlight_id
      WHERE ht.tag_id = ?
    `;
    const params: any[] = [tagId];
    
    if (pdfId) {
      query += " AND h.pdf_id = ?";
      params.push(pdfId);
    }
    
    query += " ORDER BY h.created_at DESC";
    
    const result = await this.db!.select<HighlightRecord[]>(query, params);
    return result.map(this.highlightRecordToIHighlight);
  }

  async searchHighlightsByTags(tagNames: string[], pdfId?: number): Promise<IHighlight[]> {
    await this.ensureInitialized();
    
    if (tagNames.length === 0) {
      return pdfId ? await this.getHighlightsForPdf(pdfId) : [];
    }
    
    const placeholders = tagNames.map(() => "?").join(",");
    let query = `
      SELECT DISTINCT h.* FROM highlights h
      INNER JOIN highlight_tags ht ON h.highlight_id = ht.highlight_id
      INNER JOIN tags t ON ht.tag_id = t.id
      WHERE t.name IN (${placeholders})
    `;
    const params: any[] = [...tagNames];
    
    if (pdfId) {
      query += " AND h.pdf_id = ?";
      params.push(pdfId);
    }
    
    query += " ORDER BY h.created_at DESC";
    
    const result = await this.db!.select<HighlightRecord[]>(query, params);
    return result.map(this.highlightRecordToIHighlight);
  }

  async getTagUsageStats(): Promise<{ tag: Tag; count: number }[]> {
    await this.ensureInitialized();
    const result = await this.db!.select<(Tag & { count: number })[]>(
      `SELECT t.*, COUNT(ht.highlight_id) as count
       FROM tags t
       LEFT JOIN highlight_tags ht ON t.id = ht.tag_id
       GROUP BY t.id, t.name, t.created_at
       ORDER BY count DESC, t.name ASC`
    );
    return result.map(row => ({
      tag: { id: row.id, name: row.name, created_at: row.created_at },
      count: row.count
    }));
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