import React from 'react';

const CandidateCardSkeleton: React.FC = () => {
  return (
    <div className="p-3 bg-[#2b2b2b]/50 rounded-lg border border-white/5 animate-pulse space-y-3 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="h-5 bg-[#2b2b2b] rounded w-1/2"></div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-2">
        <div className="h-4 bg-[#2b2b2b] rounded w-12"></div>
        <div className="h-4 bg-[#2b2b2b] rounded w-16"></div>
      </div>
      
      <div className="flex gap-2 mt-3 border-t border-white/5 pt-2">
        <div className="h-5 bg-[#2b2b2b] rounded w-full"></div>
      </div>
    </div>
  );
};

export default CandidateCardSkeleton;
