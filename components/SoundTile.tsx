
import React from 'react';
import { Sound, SoundType } from '../types';
import { MoreVertical, Music, Waves, Zap } from 'lucide-react';

interface SoundTileProps {
  sound: Sound;
  isPlaying: boolean;
  onPlay: (sound: Sound) => void;
  onStop: (sound: Sound) => void;
  onEdit: (sound: Sound) => void;
  onDelete: (sound: Sound) => void;
}

const typeConfig: { [key in SoundType]: { gradient: string; icon: React.ReactNode } } = {
  'Background Music': { gradient: 'from-blue-500 to-blue-600', icon: <Music size={16} /> },
  'Ambience': { gradient: 'from-emerald-500 to-emerald-600', icon: <Waves size={16} /> },
  'Sound Effect': { gradient: 'from-amber-500 to-amber-600', icon: <Zap size={16} /> },
};

const PulsingBars: React.FC = () => (
    <div className="flex items-end h-3 w-3 space-x-px">
        <span className="w-0.5 h-1 bg-white animate-pulse" style={{ animationDelay: '0ms' }}></span>
        <span className="w-0.5 h-2 bg-white animate-pulse" style={{ animationDelay: '150ms' }}></span>
        <span className="w-0.5 h-3 bg-white animate-pulse" style={{ animationDelay: '300ms' }}></span>
    </div>
);


export const SoundTile: React.FC<SoundTileProps> = ({ sound, isPlaying, onPlay, onStop, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const { gradient } = typeConfig[sound.type];

  const handleClick = () => {
    isPlaying ? onStop(sound) : onPlay(sound);
  };
  
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      onClick={handleClick}
      className={`relative group aspect-square rounded-lg p-3 flex flex-col justify-end cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-br ${gradient} ${isPlaying ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 animate-pulse' : ''}`}
    >
      <div className="absolute top-2 right-2 flex items-center space-x-2">
        {isPlaying && <PulsingBars />}
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
                className="opacity-0 group-hover:opacity-100 md:opacity-0 focus:opacity-100 transition-opacity p-1 rounded-full bg-black bg-opacity-20 hover:bg-opacity-40"
            >
                <MoreVertical size={16} className="text-white" />
            </button>
            {menuOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-slate-700 rounded-md shadow-lg z-10">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(sound); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 rounded-t-md">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(sound); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-600 rounded-b-md">Delete</button>
                </div>
            )}
        </div>
      </div>

      <div className="text-white">
        <h3 className="font-bold text-sm truncate">{sound.name}</h3>
        {sound.type === 'Background Music' && (
            <div className="flex flex-wrap gap-1 mt-1">
                {[sound.category_tag, sound.mood_tag, sound.location_tag].filter(Boolean).map((tag) => (
                    <span key={tag} className="text-xs bg-black bg-opacity-20 px-1.5 py-0.5 rounded-full">{tag}</span>
                ))}
            </div>
        )}
      </div>

      {sound.type === 'Ambience' && sound.loop && (
          <div className="absolute bottom-2 right-2 text-xs bg-black bg-opacity-20 text-white px-2 py-0.5 rounded-full">
              Loop
          </div>
      )}
    </div>
  );
};
