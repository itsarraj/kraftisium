import React from 'react';

const JobCardSkeleton: React.FC = () => {
  return (
    <div className="flex justify-start items-start self-stretch flex-grow-0 flex-shrink-0 relative gap-6 p-6 rounded-lg bg-[#1a1a1a] border border-white/5 shadow-brand animate-pulse">
      <div className="flex-grow-0 flex-shrink-0 w-[72px] h-[72px] relative overflow-hidden rounded bg-[#2b2b2b] border border-white/10" />
      
      <div className="flex flex-col justify-start items-start flex-grow relative gap-4 min-w-0">
        <div className="flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 gap-2">
          {/* Company & Title */}
          <div className="h-5 bg-[#2b2b2b] rounded w-1/4"></div>
          <div className="h-8 bg-[#2b2b2b] rounded w-2/3"></div>
          
          {/* Meta Tags Row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
            <div className="h-4 bg-[#2b2b2b] rounded w-20"></div>
            <div className="h-4 bg-[#2b2b2b] rounded w-24"></div>
            <div className="h-4 bg-[#2b2b2b] rounded w-28"></div>
            <div className="h-4 bg-[#2b2b2b] rounded w-16"></div>
          </div>
        </div>
        
        {/* Description Lines */}
        <div className="self-stretch space-y-2 mt-2">
          <div className="h-4 bg-[#2b2b2b] rounded w-full"></div>
          <div className="h-4 bg-[#2b2b2b] rounded w-5/6"></div>
        </div>
      </div>
      
      {/* Apply Button Skeleton */}
      <div className="self-start shrink-0 w-[100px] h-[36px] rounded-lg bg-[#2b2b2b]"></div>
    </div>
  );
};

export default JobCardSkeleton;
