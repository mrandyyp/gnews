import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { fetchNewsArticles, fetchTopics, fetchDiscoverArticles } from './services/newsService';
import { Article, LocaleOption } from './types';
import { ParsedArticle } from './services/readabilityService';
import { ArticleCard } from './components/ArticleCard';
import { SkeletonLoader } from './components/SkeletonLoader';
import { ReaderModal } from './components/ReaderModal';
// Auth Imports
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import { Login } from './components/Login';

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [articles, setArticles] = useState<Article[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [subTopics, setSubTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('Trending');
  const [selectedLocale, setSelectedLocale] = useState<LocaleOption>('id-ID');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);
  
  // URL/Manual Input State
  const [showUrlInput, setShowUrlInput] = useState(false);
  // Added 'detik' to the import types
  const [importMode, setImportMode] = useState<'url' | 'manual' | 'detik'>('url');
  const [inputUrl, setInputUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [importLocale, setImportLocale] = useState<LocaleOption>('id-ID');
  const [manualParsedData, setManualParsedData] = useState<ParsedArticle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Auth
  useEffect(() => {
    // Get initial session
    const initSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.warn("Auth session error:", error.message);
                // If token is invalid, ensure we are signed out locally
                if (error.message.includes("Refresh Token")) {
                    await supabase.auth.signOut();
                }
                setSession(null);
            } else {
                setSession(session);
            }
        } catch (e) {
            console.error("Unexpected auth initialization error", e);
            setSession(null);
        } finally {
            setAuthLoading(false);
        }
    };

    initSession();

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
          setSession(null);
          setArticles([]); // Clear content on logout
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
      } else if (event === 'jorne' || session) {
          // Catch-all for other events that provide a session
          setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Only load topics if authenticated
    if (!session) return;

    const initTopics = async () => {
      try {
        const data = await fetchTopics();
        // Add "Trending" as the first item manually
        setTopics(['Trending', ...(data.main_topics || [])]);
        setSubTopics(data.sub_topics || []);
      } catch (e) {
        console.error("Failed to load topics", e);
        setTopics(['Trending']); // Fallback
      }
    };
    initTopics();
  }, [session]);

  const loadNews = useCallback(async (topic: string, locale: LocaleOption) => {
    if (!topic || !session) return; // Guard against no session
    setLoading(true);
    try {
      let data;
      if (topic === 'Trending') {
        data = await fetchDiscoverArticles(locale);
      } else {
        data = await fetchNewsArticles(topic, locale);
      }
      
      const sortedArticles = (data.articles || []).sort((a, b) => b.timestamp - a.timestamp);
      setArticles(sortedArticles);
    } catch (error) {
      console.error("Failed to refresh news", error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (selectedTopic && session) loadNews(selectedTopic, selectedLocale);
  }, [loadNews, selectedTopic, selectedLocale, session]);

  const handleTopicClick = (topic: string) => {
    setSelectedTopic(topic);
    setSearchTerm('');
  };
  
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Update global locale to match the user's choice in the import modal
    setSelectedLocale(importLocale);

    try {
      if (importMode === 'detik') {
        if (!inputUrl) throw new Error("URL is required");

        const response = await fetch(`https://api.gnews.media/api/article?url=${encodeURIComponent(inputUrl)}`);
        if (!response.ok) throw new Error("Failed to fetch Detik article");
        
        const data = await response.json();
        
        if (data.status === 'error') {
           throw new Error("API returned error status");
        }

        // Parse content_text to HTML paragraphs
        const formattedContent = (data.content_text || '')
            .split('\n')
            .filter((p: string) => p.trim() !== '')
            .map((p: string) => `<p>${p}</p>`)
            .join('');

        const articleDate = data.published_at ? new Date(data.published_at) : new Date();

        const tempArticle: Article = {
            url: data.url || inputUrl,
            title: data.title || 'No Title',
            source: 'Detik/Partner',
            date: articleDate.toLocaleDateString(),
            image: data.featured_image?.url || '',
            timestamp: articleDate.getTime()
        };

        const parsed: ParsedArticle = {
            title: data.title || 'No Title',
            content: formattedContent,
            textContent: data.content_text || '',
            excerpt: (data.content_text || '').substring(0, 150) + '...',
            byline: 'Detik API',
            siteName: 'Detik Import',
            url: data.url || inputUrl,
            image: data.featured_image?.url || '',
            format: 'html'
        };

        setManualParsedData(parsed);
        setReadingArticle(tempArticle);

      } else if (importMode === 'url') {
          if (!inputUrl) throw new Error("URL is required");
          const tempArticle: Article = {
              url: inputUrl,
              title: 'Loading External Source...',
              source: new URL(inputUrl).hostname,
              date: new Date().toLocaleDateString(),
              image: '',
              timestamp: Date.now()
          };
          setManualParsedData(null); // Clear manual data
          setReadingArticle(tempArticle);
      } else {
          // Manual
          if (!manualTitle || !manualContent) throw new Error("Title and Content are required");
          const tempArticle: Article = {
              url: '',
              title: manualTitle,
              source: 'Manual Input',
              date: new Date().toLocaleDateString(),
              image: '',
              timestamp: Date.now()
          };
          
          // Construct pre-parsed data
          const parsed: ParsedArticle = {
              title: manualTitle,
              content: manualContent, // Treat as HTML/Text
              textContent: manualContent,
              excerpt: manualContent.substring(0, 100) + '...',
              byline: 'User Input',
              siteName: 'Manual Source',
              url: '',
              image: '',
              format: 'html'
          };

          setManualParsedData(parsed);
          setReadingArticle(tempArticle);
      }

      setShowUrlInput(false);
      setInputUrl('');
      setManualTitle('');
      setManualContent('');
    } catch (err) {
      console.error(err);
      alert("Failed to process import. Please check the URL or input.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const filteredArticles = useMemo(() => {
    if (!searchTerm) return articles;
    const lowerTerm = searchTerm.toLowerCase();
    return articles.filter(a => 
      a.title.toLowerCase().includes(lowerTerm) || 
      a.source.toLowerCase().includes(lowerTerm)
    );
  }, [articles, searchTerm]);

  const openImportModal = (mode: 'url' | 'manual' | 'detik' = 'url') => {
      setImportLocale(selectedLocale);
      setImportMode(mode);
      setShowUrlInput(true);
  };

  // Auth Loading State
  if (authLoading) {
     return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
     );
  }

  // Not Authenticated -> Show Login
  if (!session) {
      return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* Workspace Modal */}
      {readingArticle && (
        <ReaderModal 
          article={readingArticle} 
          currentLocale={selectedLocale}
          initialParsedData={manualParsedData}
          onClose={() => {
              setReadingArticle(null);
              setManualParsedData(null);
          }} 
        />
      )}

      {/* Import Modal Overlay */}
      {showUrlInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden scale-100 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-bold text-slate-900">
                        {importMode === 'detik' ? 'Import Detik Article' : 'Import External Source'}
                    </h3>
                    <button onClick={() => setShowUrlInput(false)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs - Only show if not in specific Detik mode or if we want to allow switching. 
                    Let's hide tabs if in Detik mode for focus, or just allow switching.
                    User request: "tombol import detik di selah tombol import source", implies distinct action. 
                    I'll hide the generic tabs if Detik is selected to keep the UI clean for that specific task.
                */}
                {importMode !== 'detik' && (
                    <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
                        <button
                            type="button"
                            onClick={() => setImportMode('url')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${importMode === 'url' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Import URL
                        </button>
                        <button
                            type="button"
                            onClick={() => setImportMode('manual')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${importMode === 'manual' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Manual Input
                        </button>
                    </div>
                )}

                <form onSubmit={handleImportSubmit} className="p-6 overflow-y-auto">
                    <div className="space-y-4">
                        
                        {(importMode === 'url' || importMode === 'detik') ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {importMode === 'detik' ? 'Paste Detik/Partner URL' : 'Paste Article URL'}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="url" 
                                        required
                                        placeholder="https://..." 
                                        value={inputUrl}
                                        onChange={(e) => setInputUrl(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                                        autoFocus
                                    />
                                    <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                </div>
                                {importMode === 'detik' && (
                                    <p className="text-xs text-slate-500 mt-2">
                                        Compatible with bola.net and detik network URLs.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Article Title</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Enter title here..." 
                                        value={manualTitle}
                                        onChange={(e) => setManualTitle(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Article Content</label>
                                    <textarea 
                                        required
                                        placeholder="Paste article content here..." 
                                        value={manualContent}
                                        onChange={(e) => setManualContent(e.target.value)}
                                        rows={6}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {importMode !== 'detik' && (
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Source Content Language</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setImportLocale('id-ID')}
                                    className={`
                                        flex flex-col items-center justify-center px-4 py-3 rounded-lg border text-sm transition-all
                                        ${importLocale === 'id-ID' 
                                            ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
                                    `}
                                >
                                    <div className="flex items-center font-bold mb-0.5">
                                        Indonesian Source
                                    </div>
                                    <span className="text-[10px] opacity-75 uppercase tracking-wide">Rewrite Mode</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImportLocale('en-US')}
                                    className={`
                                        flex flex-col items-center justify-center px-4 py-3 rounded-lg border text-sm transition-all
                                        ${importLocale === 'en-US' 
                                            ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
                                    `}
                                >
                                    <div className="flex items-center font-bold mb-0.5">
                                        English Source
                                    </div>
                                    <span className="text-[10px] opacity-75 uppercase tracking-wide">Translate to ID</span>
                                </button>
                            </div>
                        </div>
                        )}
                    </div>

                    {importMode !== 'detik' && (
                    <p className="text-xs text-slate-500 mt-4 bg-slate-50 p-3 rounded border border-slate-100">
                        {importLocale === 'en-US' 
                            ? "We will translate the English content into a professional Indonesian article." 
                            : "We will rewrite the Indonesian content into a fresh Indonesian article with a professional journalistic tone."}
                    </p>
                    )}

                    <div className="mt-6 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onClick={() => setShowUrlInput(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isProcessing}
                            className="px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Processing...' : 'Start Processing'}
                            {!isProcessing && <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Studio Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            
            {/* Brand */}
            <div className="flex items-center cursor-pointer group" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center text-white font-bold mr-3 shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                CS
              </div>
              <div className="flex flex-col">
                  <h1 className="text-xl font-extrabold text-slate-900 leading-none tracking-tight">Content Studio</h1>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-3 md:space-x-4">
              
              {/* Primary Action: Import URL */}
              <button
                onClick={() => openImportModal('url')}
                className="hidden md:flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Import Source
              </button>

              {/* Action: Import Detik */}
              <button
                onClick={() => openImportModal('detik')}
                className="hidden md:flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                Import Detik
              </button>

              <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

               {/* Search */}
              <div className="relative hidden lg:block">
                <input
                  type="text"
                  placeholder="Search feeds..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg py-2 pl-9 pr-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-56 transition-all"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <select 
                value={selectedLocale}
                onChange={(e) => setSelectedLocale(e.target.value as LocaleOption)}
                className="bg-white border border-slate-200 text-xs font-bold py-2 px-3 rounded-lg text-slate-700 cursor-pointer hover:border-primary-500 focus:ring-0 shadow-sm transition-colors"
              >
                <option value="id-ID">Source: Indonesia</option>
                <option value="en-US">Source: English</option>
              </select>

              <div className="h-6 w-px bg-slate-200"></div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-600 transition-colors p-1.5 rounded hover:bg-red-50"
                title="Sign Out"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
        
         {/* Navigation Bar */}
         <div className="border-t border-slate-100 bg-white">
             <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
                
                {/* Unified Tab Menu */}
                <div className="overflow-x-auto no-scrollbar flex items-center space-x-6" ref={scrollContainerRef}>
                    {/* Main Topics */}
                    {topics.map((topic) => (
                    <button
                        key={topic}
                        onClick={() => handleTopicClick(topic)}
                        className={`
                        py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-[3px] transition-all
                        ${selectedTopic === topic
                            ? 'border-primary-600 text-primary-700' 
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}
                        `}
                    >
                        {topic}
                    </button>
                    ))}

                    {/* Separator */}
                    {subTopics.length > 0 && topics.length > 0 && (
                        <div className="h-4 w-px bg-slate-300 shrink-0 mx-2"></div>
                    )}

                    {/* Sub Topics (Integrated) */}
                    {subTopics.map((sub) => (
                        <button
                            key={sub}
                            onClick={() => handleTopicClick(sub)}
                            className={`
                            py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-[3px] transition-all
                            ${selectedTopic === sub
                                ? 'border-primary-600 text-primary-700' 
                                : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'}
                            `}
                        >
                            {sub}
                        </button>
                    ))}
                </div>
             </div>
         </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 w-full py-6">
        
        {/* Mobile Actions */}
        <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
             <button
                onClick={() => openImportModal('url')}
                className="flex items-center justify-center px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Import URL
              </button>
              <button
                onClick={() => openImportModal('detik')}
                className="flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm"
              >
                Detik Import
              </button>
             <div className="relative w-full col-span-2 mt-1">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border border-slate-300 text-sm rounded-lg py-2.5 pl-9 pr-3 w-full shadow-sm"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
        </div>

        {loading ? (
          <SkeletonLoader />
        ) : (
          <div className="h-full">
            {filteredArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredArticles.map((article) => (
                  <ArticleCard 
                    key={article.url} 
                    article={article} 
                    onRead={setReadingArticle} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                <p className="text-lg">No source materials found.</p>
                <button 
                    onClick={() => loadNews(selectedTopic, selectedLocale)}
                    className="mt-4 text-primary-600 hover:text-primary-800 font-medium"
                >
                    Try Refreshing
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
