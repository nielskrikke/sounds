
import React from 'react';
import { Sound, SoundType } from '../types';
import { Music, Waves, Zap, Star, Repeat, Globe } from 'lucide-react';

interface SoundTileProps {
  sound: Sound;
  isPlaying: boolean;
  onPlay: (sound: Sound) => void;
  onStop: (sound: Sound) => void;
}

const typeConfig: { [key in SoundType]: { gradient: string; icon: React.ReactNode } } = {
  'Background Music': { gradient: 'from-[#222222] to-[#111111]', icon: <Music size={16} /> },
  'Ambience': { gradient: 'from-[#222222] to-[#111111]', icon: <Waves size={16} /> },
  'One-shots': { gradient: 'from-[#222222] to-[#111111]', icon: <Zap size={16} /> },
};

const PulsingBars: React.FC = () => (
    <div className="flex items-end h-3 w-3 space-x-px">
        <span className="w-0.5 h-1 bg-dnd-gold animate-pulse" style={{ animationDelay: '0ms' }}></span>
        <span className="w-0.5 h-2 bg-dnd-gold animate-pulse" style={{ animationDelay: '150ms' }}></span>
        <span className="w-0.5 h-3 bg-dnd-gold animate-pulse" style={{ animationDelay: '300ms' }}></span>
    </div>
);


export const SoundTile: React.FC<SoundTileProps> = ({ sound, isPlaying, onPlay, onStop }) => {
  const { gradient } = typeConfig[sound.type];

  const handleClick = () => {
    isPlaying ? onStop(sound) : onPlay(sound);
  };
  
  const bgmTags = [sound.category_tag, sound.location_tag].filter(Boolean);

  return (
    <div
      onClick={handleClick}
      className={`relative group aspect-square rounded-xl p-3 flex flex-col justify-end cursor-pointer transition-all duration-300 border border-white/5 bg-gradient-to-br ${gradient} hover:brightness-110 hover:border-white/10 ${isPlaying ? 'ring-2 ring-dnd-gold ring-offset-2 ring-offset-dnd-dark shadow-[0_0_15px_rgba(201,173,106,0.2)]' : 'shadow-xl'}`}
      aria-label={`Play or stop ${sound.name}`}
    >
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {sound.favorite && (
          <div className="text-dnd-gold drop-shadow-sm" title="Favorite">
            <Star size={14} fill="currentColor" />
          </div>
        )}
        {sound.include_in_all_scenes && (
            <div className="text-dnd-text/40 drop-shadow-sm" title="Included in all scenes">
                <Globe size={14} />
            </div>
        )}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-2">
        {sound.type === 'Ambience' && sound.loop && (
            <div className="text-dnd-text/40" title="Looping">
                <Repeat size={14} />
            </div>
        )}
        {isPlaying && <PulsingBars />}
      </div>

      <div className="text-dnd-text flex flex-col items-start w-full">
        {sound.type === 'Background Music' && bgmTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mb-1.5 w-full">
                {bgmTags.map((tag) => (
                    <span key={tag} className="text-[9px] font-mono bg-black/60 text-dnd-gold/90 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-wider leading-none">{tag}</span>
                ))}
            </div>
        )}
        <h3 className="font-sans font-bold text-sm break-words leading-tight group-hover:text-dnd-gold transition-colors w-full">{sound.name}</h3>
      </div>
    </div>
  );
};
