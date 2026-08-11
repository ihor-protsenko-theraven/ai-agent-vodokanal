/**
 * Gemini API request/response types
 */

export interface GeminiTextPart {
  text: string;
}

export interface GeminiInlineDataPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export type GeminiContentPart = GeminiTextPart | GeminiInlineDataPart;

export interface GeminiPartText {
  text?: string;
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPartText[];
    };
  }>;
}
