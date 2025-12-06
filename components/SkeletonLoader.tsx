import React from 'react';

export const SkeletonLoader: React.FC = () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((i) => (
        <div key={i} className="bg-white rounded-lg border border-slate-200 overflow-hidden animate-pulse flex flex-row md:flex-col h-36 md:h-[22rem]">
          {/* Image Skeleton 
              Mobile: w-1/3, h-full (matches parent h-36)
              Desktop: w-full, h-48 fixed
          */}
          <div className="w-1/3 md:w-full md:h-48 bg-slate-200 shrink-0"></div>
          
          {/* Content Skeleton */}
          <div className="p-4 w-2/3 md:w-full flex flex-col justify-between h-full">
             <div>
                {/* Meta Row */}
                <div className="flex justify-between items-center mb-3">
                    <div className="h-4 w-16 bg-slate-200 rounded-full"></div>
                    <div className="h-3 w-16 bg-slate-200 rounded"></div>
                </div>
                
                {/* Title Rows */}
                <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-200 rounded"></div>
                    <div className="h-4 w-full bg-slate-200 rounded"></div>
                    <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                </div>
             </div>
            
            {/* Button Placeholder */}
            <div className="pt-2 mt-auto">
                 <div className="h-3 w-24 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};