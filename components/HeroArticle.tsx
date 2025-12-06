import React, { useState } from 'react';
import { Article } from '../types';

interface HeroArticleProps {
  article: Article;
}

export const HeroArticle: React.FC<HeroArticleProps> = ({ article }) => {
  const [imgSrc, setImgSrc] = useState(article.image);

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm mb-10 group hover:shadow-md transition-all duration-200">
      <div className="flex flex-col md:flex-row">
        {/* Image Section */}
        <div className="md:w-3/5 h-64 md:h-[400px] relative overflow-hidden bg-slate-100">
           <a href={article.url} target="_blank" rel="noopener noreferrer">
            <img
                src={imgSrc}
                alt={article.title}
                onError={() => setImgSrc('https://picsum.photos/1200/800?blur=2')}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </a>
        </div>

        {/* Content Section */}
        <div className="md:w-2/5 p-6 md:p-8 flex flex-col justify-center bg-white">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-primary-600 text-xs font-bold uppercase tracking-wider">
              Latest Story
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 text-sm font-medium">
              {article.source}
            </span>
          </div>
          
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight mb-4 group-hover:text-primary-600 transition-colors">
              {article.title}
            </h1>
          </a>
          
          <p className="text-slate-400 text-sm mb-6">
            {article.date}
          </p>

          <div className="mt-auto">
            <a 
              href={article.url}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-800 transition-colors"
            >
              Read full story
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};