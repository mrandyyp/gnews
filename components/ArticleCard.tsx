import React, { useState } from 'react';
import { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  onRead: (article: Article) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onRead }) => {
  const [imgSrc, setImgSrc] = useState(article.image);

  return (
    <div 
        className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all duration-200 group relative cursor-pointer h-36 md:h-[22rem]" 
        onClick={() => onRead(article)}
    >
      
      {/* Selection Overlay */}
      <div className="absolute inset-0 bg-primary-900 bg-opacity-0 group-hover:bg-opacity-5 transition-all pointer-events-none z-10"></div>

      <div className="flex flex-row md:flex-col h-full">
         {/* Image Section (Thumbnail) */}
         {/* Mobile: w-1/3, h-full. Desktop: w-full, h-48 fixed */}
        <div className="w-1/3 md:w-full md:h-48 shrink-0 overflow-hidden bg-slate-100 relative">
            <img
            src={imgSrc}
            alt={article.title}
            onError={() => setImgSrc(`https://picsum.photos/600/400?random=${article.timestamp}`)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
        </div>
        
        {/* Content Section */}
        <div className="flex flex-col justify-between p-4 w-2/3 md:w-full h-full">
            <div>
                <div className="flex flex-col items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wide mb-1">
                    {article.source}
                    </span>
                    <span className="text-[10px] text-slate-400">
                    {article.date}
                    </span>
                </div>
                
                <h3 className="text-sm md:text-base font-bold text-slate-800 leading-snug line-clamp-3 group-hover:text-primary-700">
                {article.title}
                </h3>
            </div>
            
            <div className="pt-2">
                <button className="text-xs font-semibold text-primary-600 flex items-center group-hover:translate-x-1 transition-transform">
                    Use as Source
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};