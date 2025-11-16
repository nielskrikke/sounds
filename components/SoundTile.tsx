import React from 'react';
import { Sound, SoundType } from '../types';
import { Music, Waves, Zap, Star, Repeat } from 'lucide-react';

interface SoundTileProps {
  sound: Sound;
  isPlaying: boolean;
  onPlay: (sound: Sound) => void;
  onStop: (sound: Sound) => void;
}

const typeConfig: { [key in SoundType]: { gradient: string; icon: React.ReactNode } } = {
  'Background Music': { gradient: 'from-[#4A785A] to-[#376246]', icon: <Music size={16} /> },
  'Ambience': { gradient: 'from-[#B85A23] to-[#A4460F]', icon: <Waves size={16} /> },
  'One-shots': { gradient: 'from-[#9E3E3D] to-[#8A2A29]', icon: <Zap size={16} /> },
};

const PulsingBars: React.FC = () => (
    <div className="flex items-end h-3 w-3 space-x-px">
        <span className="w-0.5 h-1 bg-white animate-pulse" style={{ animationDelay: '0ms' }}></span>
        <span className="w-0.5 h-2 bg-white animate-pulse" style={{ animationDelay: '150ms' }}></span>
        <span className="w-0.5 h-3 bg-white animate-pulse" style={{ animationDelay: '300ms' }}></span>
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
      className={`relative group aspect-square rounded-xl p-3 flex flex-col justify-end cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-br ${gradient} ${isPlaying ? 'ring-2 ring-white ring-offset-2 ring-offset-stone-900 animate-glow' : ''}`}
      aria-label={`Play or stop ${sound.name}`}
    >
      <div className="absolute top-2 left-2">
        {sound.favorite && (
          <div className="text-yellow-400">
            <Star size={14} fill="currentColor" />
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-2">
        {sound.type === 'Ambience' && sound.loop && (
            <div className="text-white opacity-70" title="Looping">
                <Repeat size={14} />
            </div>
        )}
        {isPlaying && <PulsingBars />}
      </div>

      <div className="text-white">
        {sound.type === 'Background Music' && bgmTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mb-1">
                {bgmTags.map((tag) => (
                    <span key={tag} className="text-xs bg-black bg-opacity-20 text-white px-1.5 py-0.5 rounded-full">{tag}</span>
                ))}
            </div>
        )}
        <h3 className="font-bold text-sm break-words">{sound.name}</h3>
      </div>
    </div>
  );
};
