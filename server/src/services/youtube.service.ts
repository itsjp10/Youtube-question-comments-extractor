import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { extractVideoId } from '../utils/youtube-url';
import { stripHtml, collapseWhitespace } from '../utils/text';
import type { RawComment, VideoMetadata } from '../types';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YouTubeErrorPayload {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
}

/**
 * Thin wrapper around YouTube Data API v3. Responsibilities:
 *  - extract the video id from a URL
 *  - fetch video metadata (snippet + statistics)
 *  - fetch top-level comments with pagination
 *  - translate API failure modes into typed `ApiError`s
 */
class YouTubeService {
  private get apiKey(): string {
    if (!env.YOUTUBE_API_KEY) {
      throw ApiError.internal(
        'YOUTUBE_API_KEY is not configured. Add it to server/.env to run analyses.',
      );
    }
    return env.YOUTUBE_API_KEY;
  }

  /** Re-exported for controllers that only need the id. */
  extractVideoId(url: string): string {
    return extractVideoId(url);
  }

  async getVideoMetadata(videoId: string): Promise<VideoMetadata> {
    const url = new URL(`${API_BASE}/videos`);
    url.searchParams.set('part', 'snippet,statistics,status');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', this.apiKey);

    const data = await this.request<{
      items?: Array<{
        snippet?: {
          title?: string;
          channelTitle?: string;
          publishedAt?: string;
          thumbnails?: Record<string, { url?: string }>;
        };
        statistics?: { viewCount?: string; commentCount?: string };
        status?: { privacyStatus?: string };
      }>;
    }>(url);

    const item = data.items?.[0];
    if (!item) {
      throw ApiError.notFound('No YouTube video was found for that id (it may be deleted or private).');
    }
    if (item.status?.privacyStatus === 'private') {
      throw ApiError.unprocessable('This video is private and cannot be analysed.');
    }

    const thumbs = item.snippet?.thumbnails ?? {};
    const thumbnailUrl =
      thumbs.maxres?.url ??
      thumbs.standard?.url ??
      thumbs.high?.url ??
      thumbs.medium?.url ??
      thumbs.default?.url ??
      null;

    return {
      videoId,
      title: item.snippet?.title ?? null,
      channelTitle: item.snippet?.channelTitle ?? null,
      thumbnailUrl,
      viewCount: item.statistics?.viewCount ?? null,
      commentCount: item.statistics?.commentCount ? Number(item.statistics.commentCount) : null,
      publishedAt: item.snippet?.publishedAt ?? null,
      // If `commentCount` is entirely absent the video usually has comments off.
      commentsDisabled: item.statistics?.commentCount === undefined,
    };
  }

  /**
   * Fetch up to `max` top-level comments, ordered by relevance. Replies are not
   * fetched (out of scope for v1).
   */
  async getComments(videoId: string, max: number): Promise<RawComment[]> {
    const comments: RawComment[] = [];
    let pageToken: string | undefined;

    while (comments.length < max) {
      const url = new URL(`${API_BASE}/commentThreads`);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('videoId', videoId);
      url.searchParams.set('maxResults', '100');
      url.searchParams.set('order', 'relevance');
      url.searchParams.set('textFormat', 'plainText');
      url.searchParams.set('key', this.apiKey);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const data = await this.request<{
        nextPageToken?: string;
        items?: Array<{
          snippet?: {
            topLevelComment?: {
              id?: string;
              snippet?: {
                textDisplay?: string;
                textOriginal?: string;
                authorDisplayName?: string;
                likeCount?: number;
                publishedAt?: string;
              };
            };
          };
        }>;
      }>(url, { commentsContext: true });

      for (const thread of data.items ?? []) {
        const c = thread.snippet?.topLevelComment;
        const s = c?.snippet;
        if (!c?.id || !s) continue;
        const text = collapseWhitespace(stripHtml(s.textOriginal || s.textDisplay || ''));
        if (!text) continue;
        comments.push({
          commentId: c.id,
          text,
          author: s.authorDisplayName ?? null,
          likeCount: typeof s.likeCount === 'number' ? s.likeCount : 0,
          publishedAt: s.publishedAt ?? null,
        });
        if (comments.length >= max) break;
      }

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    return comments;
  }

  private async request<T>(url: URL, opts: { commentsContext?: boolean } = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, { headers: { Accept: 'application/json' } });
    } catch (err) {
      throw ApiError.badGateway(`Could not reach the YouTube API: ${(err as Error).message}`);
    }

    if (res.ok) return (await res.json()) as T;

    const payload = (await res.json().catch(() => ({}))) as YouTubeErrorPayload;
    const reason = payload.error?.errors?.[0]?.reason ?? '';
    const message = payload.error?.message ?? `YouTube API error (HTTP ${res.status})`;

    switch (reason) {
      case 'commentsDisabled':
        throw ApiError.unprocessable('YouTube comments are disabled for this video.');
      case 'videoNotFound':
        throw ApiError.notFound('The YouTube video was not found.');
      case 'quotaExceeded':
      case 'dailyLimitExceeded':
      case 'rateLimitExceeded':
      case 'userRateLimitExceeded':
        throw ApiError.badGateway('YouTube API quota / rate limit exceeded. Try again later.');
      case 'keyInvalid':
      case 'badRequest':
        if (/API key/i.test(message)) {
          throw ApiError.badGateway('The configured YOUTUBE_API_KEY is invalid.');
        }
        break;
      case 'forbidden':
        throw ApiError.unprocessable(message);
      default:
        break;
    }

    if (res.status === 403 && opts.commentsContext) {
      throw ApiError.unprocessable('YouTube comments are disabled or restricted for this video.');
    }
    if (res.status === 404) throw ApiError.notFound('The YouTube resource was not found.');
    if (res.status === 400 && /API key/i.test(message)) {
      throw ApiError.badGateway('The configured YOUTUBE_API_KEY is invalid.');
    }

    throw ApiError.badGateway(message);
  }
}

export const youtubeService = new YouTubeService();
