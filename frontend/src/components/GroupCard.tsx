import React from 'react';

interface GroupCardProps {
  courseCode: string;
  title: string;
  memberCount: number;
  imageUrl: string;
  groupUrl?: string;
}

const GroupCard: React.FC<GroupCardProps> = ({ courseCode, title, memberCount, imageUrl, groupUrl }) => {
  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,6,19,0.08)] transition-all duration-500 flex flex-col border border-outline-variant/10">
      <div className="relative h-48 overflow-hidden bg-slate-200">
        <img 
          alt={title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
          src={imageUrl} 
        />
        <div className="absolute top-4 right-4 bg-[#001F3F]/90 backdrop-blur-sm text-white px-2 py-1 text-[10px] font-bold rounded tracking-tighter">
          {courseCode}
        </div>
      </div>
      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-bold font-headline text-primary mb-2">{title}</h3>
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-sm text-on-primary-container">groups</span>
          <span className="text-xs text-secondary font-medium">{memberCount} Active Members</span>
        </div>
        <button 
          onClick={() => groupUrl && window.open(groupUrl, '_blank')}
          className="mt-auto w-full py-3 bg-[#001F3F] text-white font-bold rounded-md hover:bg-blue-950 transition-all duration-300 shadow-sm flex items-center justify-center gap-2"
        >
          View Group
          <span className="material-symbols-outlined text-sm text-white">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default GroupCard;
