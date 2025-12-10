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

export const fetchWordpressArticle = async (url: string): Promise<ParsedArticle> => {
  try {
    const urlObj = new URL(url);
    // 1. Extract Slug
    // Remove trailing slash if exists, then take the last segment
    const pathname = urlObj.pathname.replace(/\/$/, "");
    const parts = pathname.split('/');
    const slug = parts[parts.length - 1];

    if (!slug) throw new Error("Could not extract slug for WordPress fallback");

    // 2. Construct WP API URL (assume standard WP structure)
    // We add _embed to retrieve featured images and author info
    const wpApiUrl = `${urlObj.protocol}//${urlObj.hostname}/wp-json/wp/v2/posts?slug=${slug}&_embed`;

    const response = await fetch(wpApiUrl);
    if (!response.ok) throw new Error("WordPress API returned error");

    const data = await response.json();
    
    // WP API returns an array, take the first item
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No post found via WordPress API");
    }

    const post = data[0];

    // 3. Clean Content (Remove YouTube Embeds)
    let content = post.content?.rendered || '';
    
    // Regex to remove iframe tags that contain youtube or youtu.be
    // This handles standard WP embeds for YouTube
    content = content.replace(/<iframe[^>]*src="[^"]*(youtube\.com|youtu\.be)[^"]*"[^>]*>.*?<\/iframe>/g, '');
    content = content.replace(/<figure[^>]*class="wp-block-embed-youtube"[^>]*>.*?<\/figure>/g, '');
    
    // 4. Extract Image from _embedded
    let featuredImage = '';
    if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
      featuredImage = post._embedded['wp:featuredmedia'][0].source_url || '';
    }

    // 5. Extract Author
    let author = 'WordPress Author';
    if (post._embedded && post._embedded['author'] && post._embedded['author'][0]) {
      author = post._embedded['author'][0].name || author;
    }

    return {
      title: post.title?.rendered || 'Untitled',
      content: content,
      textContent: content.replace(/<[^>]+>/g, ''), // Simple strip tags
      excerpt: (post.excerpt?.rendered || '').replace(/<[^>]+>/g, ''),
      byline: author,
      siteName: urlObj.hostname,
      url: url,
      image: featuredImage,
      format: 'html'
    };

  } catch (error: any) {
    console.warn("WordPress fallback failed:", error);
    throw new Error("WordPress fallback failed");
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
