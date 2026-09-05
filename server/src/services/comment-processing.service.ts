import { aiService } from './ai.service';
import { collapseWhitespace, normalizeText, stripHtml } from '../utils/text';
import { RELEVANT_INTENTS } from '../types';
import type { CleanComment, ClassifiedComment, RawComment } from '../types';

const MIN_LENGTH = 3;
const MAX_LENGTH = 1200;

/**
 * Steps 1-4 of the pipeline: cleaning, intent classification and keeping only
 * the comments that could be a FAQ (QUESTION / PROBLEM / REQUEST).
 */
class CommentProcessingService {
  /** Clean + de-duplicate raw comments. */
  cleanComments(raw: RawComment[]): CleanComment[] {
    const seen = new Map<string, CleanComment>();

    for (const c of raw) {
      const text = collapseWhitespace(stripHtml(c.text));
      if (text.length < MIN_LENGTH) continue;

      const clean: CleanComment = {
        ...c,
        text,
        cleanText: text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH)}…` : text,
      };

      // Collapse exact duplicates (bots, copy-paste), keeping the most-liked one.
      const key = normalizeText(text);
      if (!key) continue;
      const existing = seen.get(key);
      if (!existing || clean.likeCount > existing.likeCount) {
        seen.set(key, clean);
      }
    }

    return [...seen.values()];
  }

  /** Attach an intent + confidence to every clean comment. */
  async classifyComments(comments: CleanComment[]): Promise<ClassifiedComment[]> {
    if (comments.length === 0) return [];
    const classifications = await aiService.classifyComments(comments.map((c) => c.cleanText));

    return comments.map((c, i) => {
      const cls = classifications[i];
      return {
        ...c,
        intent: cls?.intent ?? 'OTHER',
        confidence: cls?.confidence ?? 0.3,
      };
    });
  }

  /** Keep only FAQ-worthy intents. */
  filterRelevant(comments: ClassifiedComment[]): ClassifiedComment[] {
    return comments.filter((c) => RELEVANT_INTENTS.includes(c.intent));
  }
}

export const commentProcessingService = new CommentProcessingService();
