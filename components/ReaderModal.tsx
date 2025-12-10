import React, { useEffect, useState } from 'react';
import { Article } from '../types';
import { parseArticleContent, fetchWordpressArticle, ParsedArticle } from '../services/readabilityService';
import DOMPurify from 'dompurify';

interface ReaderModalProps {
  article: Article | null;
  // currentLocale is no longer needed but kept optional to prevent breaking App.tsx usage temporarily if strictly typed
  currentLocale?: any; 
  initialParsedData?: ParsedArticle | null;
  onClose: () => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({ article, initialParsedData = null, onClose }) => {
  const [parsedData, setParsedData] = useState<ParsedArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  
  // Source Copy State
  const [sourceCopied, setSourceCopied] = useState(false);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (article) {
      setLoading(true);
      setError(null);
      setParsedData(null);
      setLoadingStep('Fetching content...');
      
      // If manually parsed data is provided, skip fetch
      if (initialParsedData) {
          setParsedData(initialParsedData);
          setLoading(false);
          return;
      }

      const fetchContent = async () => {
        try {
            // Attempt 1: Standard Parser
            try {
                const data = await parseArticleContent(article.url);
                if (!data.content || data.content.length < 100) {
                     throw new Error("Content too short or empty");
                }
                setParsedData(data);
                setLoading(false);
            } catch (standardError) {
                console.warn("Standard parser failed, attempting WordPress fallback...", standardError);
                setLoadingStep('Standard parser failed. Trying WordPress API...');
                
                // Attempt 2: WordPress REST API Fallback
                try {
                    const wpData = await fetchWordpressArticle(article.url);
                    setParsedData(wpData);
                    setLoading(false);
                } catch (wpError) {
                    console.error("WordPress fallback failed", wpError);
                    throw new Error("Could not extract content using standard parser or WordPress API.");
                }
            }
        } catch (finalError: any) {
            setError(finalError.message || "Failed to load content.");
            setLoading(false);
        }
      };

      fetchContent();
    }
  }, [article, initialParsedData]);

  const handleCopyContent = () => {
    if (!parsedData) return;
    // Prefer textContent for copying to clipboard as it is cleaner for pasting
    const textToCopy = parsedData.textContent || parsedData.content.replace(/<[^>]*>?/gm, '');
    navigator.clipboard.writeText(textToCopy);
    setSourceCopied(true);
    setTimeout(() => setSourceCopied(false), 2000);
  };

  if (!article) return null;

  // Sanitization
  const sanitize = (html: string) => {
     return DOMPurify.sanitize(html, {
        FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
        FORBID_ATTR: ['style', 'onclick', 'onmouseover'] 
    });
  };

  const getSourceContent = () => {
    if (!parsedData) return '';
    if (parsedData.content) {
         let content = parsedData.content.replace(/ADVERTISEMENT/gi, '');
         return sanitize(content);
    }
    if (parsedData.textContent) {
        return parsedData.textContent.split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => `<p>${line}</p>`)
            .join('');
    }
    return '';
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm" 
        aria-modal="true"
        onClick={onClose}
    >
        {/* Custom Styles for Readability */}
        <style>{`
            .article-content {
                font-family: 'Merriweather', serif;
                color: #334155;
            }
            .article-content p {
                margin-bottom: 1.8em;
                line-height: 1.85;
                font-size: 1.125rem; /* 18px */
            }
            .article-content h1, .article-content h2, .article-content h3, .article-content h4 {
                font-family: 'Inter', sans-serif;
                font-weight: 700;
                color: #0f172a;
                margin-top: 2.5em;
                margin-bottom: 1em;
                line-height: 1.3;
            }
            .article-content h2 { font-size: 1.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; }
            .article-content h3 { font-size: 1.25rem; }
            .article-content ul, .article-content ol {
                margin-bottom: 1.8em;
                padding-left: 1.5em;
                color: #334155;
            }
            .article-content li {
                margin-bottom: 0.75em;
                line-height: 1.7;
                padding-left: 0.5em;
            }
            .article-content ul { list-style-type: disc; }
            .article-content ol { list-style-type: decimal; }
            .article-content img {
                border-radius: 0.75rem;
                margin: 2.5rem auto;
                display: block;
                max-width: 100%;
                height: auto;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            }
            .article-content figure {
                margin: 2.5rem 0;
            }
            .article-content figcaption {
                text-align: center;
                font-size: 0.875rem;
                color: #64748b;
                margin-top: 0.75rem;
                font-family: 'Inter', sans-serif;
            }
            .article-content blockquote {
                border-left: 4px solid #8b5cf6;
                padding: 1.5rem;
                margin: 2rem 0;
                font-style: italic;
                color: #475569;
                background: #f8fafc;
                border-radius: 0 0.5rem 0.5rem 0;
            }
            .article-content a {
                color: #7c3aed;
                text-decoration: underline;
                text-underline-offset: 4px;
                text-decoration-color: #ddd6fe;
                transition: all 0.2s;
            }
            .article-content a:hover {
                text-decoration-color: #7c3aed;
                color: #6d28d9;
            }
            .article-content strong, .article-content b {
                font-weight: 700;
                color: #1e293b;
            }
            /* Code blocks if any */
            .article-content pre {
                background: #1e293b;
                color: #f8fafc;
                padding: 1rem;
                border-radius: 0.5rem;
                overflow-x: auto;
                margin-bottom: 1.8em;
            }
        `}</style>

      {/* Modal Container */}
      <div 
        className="flex-1 flex flex-col bg-white w-full max-w-3xl mx-auto md:my-6 md:rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* 1. Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0 z-20">
            <div className="flex items-center space-x-3 overflow-hidden">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-lg shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                </div>
                <div className="flex flex-col min-w-0">
                    <h2 className="text-base font-bold text-slate-900 truncate">
                       Reader Mode
                    </h2>
                    <div className="text-xs text-slate-500 truncate">
                        {parsedData?.siteName || article.source}
                    </div>
                </div>
            </div>
            
            <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Close (ESC)"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* 2. Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
            <div className="flex items-center">
                 {article.url ? (
                    <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-slate-600 hover:text-primary-600 text-xs font-semibold flex items-center transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-md hover:border-primary-300 shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Visit Original URL
                    </a>
                ) : (
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">Manual Entry</span>
                )}
            </div>

            <button 
                onClick={handleCopyContent}
                disabled={loading || !parsedData}
                className={`
                    text-xs font-bold flex items-center px-4 py-2 rounded-lg transition-all shadow-sm
                    ${sourceCopied 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-primary-500/20'}
                    ${(loading || !parsedData) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                {sourceCopied ? (
                    <>
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        Copied!
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        Copy Content
                    </>
                )}
            </button>
        </div>
        
        {/* 3. Content Area */}
        <div className="flex-1 overflow-y-auto bg-white p-6 md:p-12 custom-scrollbar">
            {loading ? (
                <div className="max-w-2xl mx-auto space-y-8 animate-pulse text-center pt-10">
                    <div className="space-y-4">
                        <div className="h-10 bg-slate-100 rounded-lg w-3/4 mx-auto"></div>
                        <div className="h-5 bg-slate-100 rounded w-1/4 mx-auto"></div>
                    </div>
                    <div className="space-y-4 pt-4 text-left">
                        <div className="h-4 bg-slate-100 rounded"></div>
                        <div className="h-4 bg-slate-100 rounded"></div>
                        <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                        <div className="h-4 bg-slate-100 rounded"></div>
                        <div className="h-4 bg-slate-100 rounded w-4/5"></div>
                    </div>
                    <p className="text-sm text-slate-500 font-medium mt-6 animate-pulse">{loadingStep}</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="bg-red-50 p-4 rounded-full mb-4 text-red-500 ring-4 ring-red-50/50">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Could Not Load Content</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">{error}</p>
                    {article.url && (
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 font-semibold text-sm">
                            Open directly in browser &rarr;
                        </a>
                    )}
                </div>
            ) : (
                <div className="max-w-2xl mx-auto">
                    {/* Featured Image (if available) */}
                    {(parsedData?.image || article.image) && (
                         <div className="mb-8 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                            <img 
                                src={parsedData?.image || article.image} 
                                alt={parsedData?.title || article.title} 
                                className="w-full h-auto object-cover max-h-[400px]"
                                onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                         </div>
                    )}

                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6 font-sans">
                        {parsedData?.title || article.title}
                    </h1>
                    
                    {/* The Article Content with Custom Class */}
                    <div 
                        className="article-content"
                        dangerouslySetInnerHTML={{ __html: getSourceContent() }} 
                    />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
