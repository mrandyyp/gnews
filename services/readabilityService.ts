export interface ParsedArticle {
  title: string;
  content: string; // HTML string
  textContent: string; 
  excerpt: string;
  byline: string;
  siteName: string;
  url: string;
  image: string;
  format: 'html';
}

export interface RewrittenArticleResponse {
  title?: string;
  alternativeTitles?: string[];
  content: string;
  metaDescription?: string;
}

export const parseArticleContent = async (url: string): Promise<ParsedArticle> => {
  if (!url) throw new Error("Invalid URL provided");

  const apiUrl = `https://api.gnews.media/read?url=${encodeURIComponent(url)}`;
  
  try {
    const response = await fetch(apiUrl);

    let json;
    try {
        json = await response.json();
    } catch (e) {
        if (!response.ok) {
             throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        throw new Error('Invalid response format from API');
    }

    if (json.status === 'error') {
        throw new Error(json.message || 'Failed to fetch URL');
    }

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = json.data || json; 

    let author = data.author || data.byline || '';
    if (Array.isArray(author)) {
      author = author.join(', ');
    }

    return {
      title: data.title || '',
      content: data.content || '',
      textContent: data.textContent || '',
      excerpt: data.excerpt || '',
      byline: author,
      siteName: data.siteName || '',
      url: data.url || url,
      image: data.image || '',
      format: 'html'
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to parse article content");
  }
};

export const rewriteArticleContent = async (
  title: string, 
  content: string, 
  targetLocale: string = 'id-ID',
  searchGrounding: boolean = false
): Promise<RewrittenArticleResponse> => {
  // Switch endpoint based on target locale
  // en-US uses /translate, others use /rewrite
  const endpoint = targetLocale === 'en-US' 
    ? 'https://api.gnews.media/translate' 
    : 'https://api.gnews.media/rewrite';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        title, 
        content, 
        search_grounding: searchGrounding 
      }),
    });

    let json;
    try {
        json = await response.json();
    } catch (e) {
         if (!response.ok) throw new Error(`API Error: ${response.status}`);
         throw new Error('Invalid response format');
    }

    if (json.status === 'error') {
      throw new Error(json.message || 'Processing failed');
    }

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = json.data || json;

    return {
      // Check for new_title (rewrite) OR translated_title (translate) OR fallback
      title: data.new_title || data.translated_title || data.title || data.original_title,
      
      alternativeTitles: data.alternative_titles || [],
      
      // Check for rewritten_content OR translated_content (translate) OR generic content
      content: data.rewritten_content || data.translated_content || data.content || '',
      
      metaDescription: data.meta_description || ''
    };
  } catch (error: any) {
    throw new Error(error.message || "Service unavailable");
  }
};