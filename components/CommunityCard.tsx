
import React from 'react';
import { Community } from '../types';

interface Props {
  community: Community;
  onSelect: (c: Community) => void;
}

const CommunityCard: React.FC<Props> = ({ community, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(community)}
      className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl hover:border-zinc-700 hover:bg-zinc-900 transition-all cursor-pointer group"
    >
      <div className="relative mb-4">
        <img 
          src={community.imageUrl} 
          alt={community.name} 
          className="w-full h-32 object-cover rounded-xl"
        />
        {community.isPrivate && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-bold text-zinc-300">
            🔒 PRIVATE
          </div>
        )}
      </div>
      
      <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors mb-1">
        {community.name}
      </h3>
      <p className="text-zinc-400 text-sm line-clamp-2 mb-4 h-10">
        {community.description}
      </p>

      <div className="flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center gap-2 text-zinc-500">
          {/* Fix: use membersCount instead of members which doesn't exist on Community */}
          <span>👥 {community.membersCount.toLocaleString()} members</span>
        </div>
        <div className={`px-2 py-1 rounded-md ${
          community.activityScore > 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          {community.activityScore}% Activity
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {community.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-full text-[10px] uppercase">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CommunityCard;
