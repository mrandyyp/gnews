import React, { useEffect, useState } from 'react';
import { Article, LocaleOption } from '../types';
import { parseArticleContent, rewriteArticleContent, ParsedArticle } from '../services/readabilityService';
import DOMPurify from 'dompurify';

interface ReaderModalProps {
  article: Article | null;
  currentLocale?: LocaleOption;
  initialParsedData?: ParsedArticle | null;
  onClose: () => void;
}

// Helper Component for Copyable Sections
const CopyableSection: React.FC<{
  label: string;
  content: string | null;
  isHtml?: boolean;
  className?: string;
}> = ({ label, content, isHtml = false, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content) return null;

  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm mb-4 group ${className}`}>
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <button
          onClick={handleCopy}
          className={`
            flex items-center text-xs font-medium px-2 py-1 rounded transition-all
            ${copied 
              ? 'bg-green-100 text-green-700' 
              : 'text-primary-600 hover:bg-primary-50'}
          `}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div className="p-4 bg-white">
        {isHtml ? (
           <div className="prose prose-indigo prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
           <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">{content}</p>
        )}
      </div>
    </div>
  );
};

// Helper Component for List Items (Alternative Titles)
const CopyableListItem: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3 flex justify-between items-center group hover:bg-slate-50 transition-colors border-b last:border-b-0 border-slate-100">
      <span className="text-sm text-slate-700 font-medium pr-4">{text}</span>
      <button
        onClick={handleCopy}
        className={`
          shrink-0 flex items-center text-xs font-medium px-2 py-1 rounded transition-all opacity-0 group-hover:opacity-100
          ${copied 
            ? 'bg-green-100 text-green-700 opacity-100' 
            : 'text-primary-600 hover:bg-primary-50'}
        `}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

export const ReaderModal: React.FC<ReaderModalProps> = ({ article, currentLocale = 'id-ID', initialParsedData = null, onClose }) => {
  const [parsedData, setParsedData] = useState<ParsedArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Rewrite/Translate State
  const [isRewriting, setIsRewriting] = useState(false);
  const [targetLocale, setTargetLocale] = useState<LocaleOption>(currentLocale);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [rewrittenContent, setRewrittenContent] = useState<string | null>(null);
  const [rewrittenTitle, setRewrittenTitle] = useState<string | null>(null);
  const [rewrittenMetaDescription, setRewrittenMetaDescription] = useState<string | null>(null);
  const [rewrittenAlternativeTitles, setRewrittenAlternativeTitles] = useState<string[] | null>(null);
  
  // Source Copy State
  const [sourceCopied, setSourceCopied] = useState(false);

  // Tab State for Mobile
  const [activeTab, setActiveTab] = useState<'source' | 'output'>('source');

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
      setRewrittenContent(null);
      setRewrittenTitle(null);
      setRewrittenMetaDescription(null);
      setRewrittenAlternativeTitles(null);
      setActiveTab('source');
      setTargetLocale(currentLocale); // Reset to default when opening new article
      setUseSearchGrounding(false); // Reset grounding
      
      // If manually parsed data is provided, skip fetch
      if (initialParsedData) {
          setParsedData(initialParsedData);
          setLoading(false);
          return;
      }

      parseArticleContent(article.url)
        .then((data) => {
          setParsedData(data);
          setLoading(false);
        })
        .catch(err => {
          // Suppress console error for clean logs
          setError(err.message || "Could not extract article content.");
          setLoading(false);
        });
    }
  }, [article, currentLocale, initialParsedData]);

  const handleRewrite = async () => {
    if (!parsedData) return;

    setIsRewriting(true);
    // Switch to output tab immediately on mobile
    setActiveTab('output'); 

    try {
        const textToRewrite = parsedData.textContent || parsedData.content.replace(/<[^>]*>?/gm, '');
        // Pass targetLocale and searchGrounding to service
        const result = await rewriteArticleContent(
            parsedData.title, 
            textToRewrite, 
            targetLocale, 
            useSearchGrounding
        );
        
        setRewrittenContent(result.content);
        setRewrittenTitle(result.title || null);
        setRewrittenMetaDescription(result.metaDescription || null);
        setRewrittenAlternativeTitles(result.alternativeTitles || null);
    } catch (e) {
        console.error("Rewrite/Translate failed", e);
        alert("Failed to process the article. Please try again.");
    } finally {
        setIsRewriting(false);
    }
  };

  const handleCopySource = () => {
    if (!parsedData) return;
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

  const displayImage = parsedData?.image || article.image;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:overflow-hidden" aria-modal="true">
      
      {/* 1. Top Bar / Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0 shadow-sm z-20">
        <div className="flex items-center overflow-hidden">
            <div className="p-1.5 bg-primary-100 text-primary-700 rounded mr-3 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 truncate pr-4">
                   {parsedData?.title || article.title}
                </h2>
                <div className="text-xs text-slate-500">
                    {parsedData?.siteName || article.source}
                </div>
            </div>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
             <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors group"
                title="Close (ESC)"
             >
                <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
        </div>
      </div>

      {/* 2. Main Workspace (Split Screen) */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
        
        {/* Mobile Tabs */}
        <div className="sm:hidden flex border-b border-slate-200 bg-slate-50">
            <button 
                onClick={() => setActiveTab('source')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'source' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500'}`}
            >
                Source
            </button>
            <button 
                onClick={() => setActiveTab('output')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'output' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500'}`}
            >
                Output
            </button>
        </div>

        {/* --- LEFT PANEL: SOURCE --- */}
        <div className={`
            flex-1 flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden
            ${activeTab === 'source' ? 'block' : 'hidden sm:flex'}
        `}>
            <div className="px-6 py-3 border-b border-slate-200 bg-white/50 backdrop-blur flex justify-between items-center sticky top-0 z-10">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{article.url}</span>
                
                <div className="flex items-center space-x-3">
                     {article.url ? (
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 text-xs font-medium flex items-center">
                            Visit Site <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                    ) : (
                        <span className="text-xs font-medium text-slate-400">Manual Entry</span>
                    )}

                    {parsedData && <div className="h-3 w-px bg-slate-300"></div>}

                    {parsedData && (
                        <button 
                            onClick={handleCopySource}
                            className={`
                                text-xs font-medium flex items-center transition-colors
                                ${sourceCopied ? 'text-green-600' : 'text-slate-500 hover:text-primary-600'}
                            `}
                        >
                            {sourceCopied ? (
                                <>
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Copied
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    Copy Content
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-slate-200 rounded"></div>
                            <div className="h-4 bg-slate-200 rounded"></div>
                            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
                        <div className="bg-red-100 p-3 rounded-full mb-3 text-red-500">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <p className="text-slate-800 font-medium mb-1">Content Unavailable</p>
                        <p className="text-sm text-slate-500">{error}</p>
                    </div>
                ) : (
                    <div className="prose prose-slate prose-sm max-w-none font-serif">
                        <h1 className="text-xl md:text-2xl">{parsedData?.title}</h1>
                        <div dangerouslySetInnerHTML={{ __html: getSourceContent() }} />
                    </div>
                )}
            </div>

            {/* Action Bar (Left) */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col gap-3">
                {/* Search Grounding Toggle */}
                <div className="flex items-center justify-between px-1">
                    <label htmlFor="grounding-toggle" className="text-xs font-medium text-slate-600 flex items-center cursor-pointer select-none">
                        <span className="mr-2">Use Search Grounding</span>
                        <div className="relative group">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg z-50">
                                Verify facts and enrich content using Google Search.
                            </div>
                        </div>
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            id="grounding-toggle"
                            className="sr-only peer"
                            checked={useSearchGrounding}
                            onChange={(e) => setUseSearchGrounding(e.target.checked)}
                            disabled={loading || isRewriting || !!error}
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                </div>

                <button
                    onClick={handleRewrite}
                    disabled={loading || isRewriting || !!error}
                    className={`
                        flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all w-full
                        ${loading || isRewriting || !!error
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-primary-500/30'}
                    `}
                >
                    {isRewriting ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Processing...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            {targetLocale === 'en-US' ? 'Generate Output (Translate to ID)' : 'Generate Output (Rewrite)'}
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* --- RIGHT PANEL: OUTPUT --- */}
        <div className={`
            flex-1 flex flex-col bg-slate-50/50 overflow-hidden
            ${activeTab === 'output' ? 'block' : 'hidden sm:flex'}
        `}>
             <div className="px-6 py-3 border-b border-slate-200 bg-white flex justify-between items-center sticky top-0 z-10">
                <span className="text-xs font-bold text-primary-600 uppercase tracking-wider flex items-center">
                    <span className="w-2 h-2 rounded-full bg-primary-500 mr-2 animate-pulse"></span>
                    AI Output
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Ready to Publish</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
                {isRewriting ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="animate-bounce mb-4 text-4xl">✨</div>
                        <p className="animate-pulse font-medium">Crafting new content...</p>
                    </div>
                ) : rewrittenContent ? (
                    <div className="max-w-3xl mx-auto">
                        {/* 1. Featured Image */}
                        {displayImage && (
                            <div className="mb-6 rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group bg-white">
                                 <img 
                                    src={displayImage} 
                                    alt="Featured" 
                                    className="w-full h-auto max-h-64 object-cover"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded">Featured Image</span>
                                </div>
                            </div>
                        )}

                        {/* 2. New Title */}
                        <CopyableSection 
                            label="New Title" 
                            content={rewrittenTitle} 
                        />

                        {/* 2b. Alternative Titles */}
                        {rewrittenAlternativeTitles && rewrittenAlternativeTitles.length > 0 && (
                             <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm mb-4">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alternative Titles</span>
                                </div>
                                <div>
                                    {rewrittenAlternativeTitles.map((altTitle, index) => (
                                        <CopyableListItem key={index} text={altTitle} />
                                    ))}
                                </div>
                             </div>
                        )}

                        {/* 3. Meta Description */}
                        <CopyableSection 
                            label="Meta Description" 
                            content={rewrittenMetaDescription} 
                        />

                        {/* 4. Main Content */}
                        <CopyableSection 
                            label="Article Content" 
                            content={sanitize(rewrittenContent)} 
                            isHtml={true} 
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                        <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <p className="text-sm">Select "Generate Output" to create content.</p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};
