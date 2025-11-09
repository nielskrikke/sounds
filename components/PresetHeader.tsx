import React from 'react';
import { Scene } from '../types';
import { Play, Pause, Volume2, VolumeX, LogOut } from 'lucide-react';
import { AirPlayButton } from './AirPlayButton';

interface SceneHeaderProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onSelectScene: (sceneId: string | null) => void;
  isBgmPlaying: boolean;
  onToggleBgm: () => void;
  bgmVolume: number;
  onBgmVolumeChange: (volume: number) => void;
  onLogout: () => void;
  airplayElement: HTMLAudioElement | null;
}

export const SceneHeader: React.FC<SceneHeaderProps> = ({
  scenes,
  activeSceneId,
  onSelectScene,
  isBgmPlaying,
  onToggleBgm,
  bgmVolume,
  onBgmVolumeChange,
  onLogout,
  airplayElement
}) => {
  const buttonClass = "px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap";
  const activeClass = "bg-amber-600 text-white";
  const inactiveClass = "bg-stone-700 text-stone-300 hover:bg-stone-600";

  return (
    <header className="bg-stone-800/50 backdrop-blur-sm sticky top-0 z-20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-700">
      <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto flex-wrap">
        <h2 className="text-xl font-medieval text-white mr-2">Scenes</h2>
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => onSelectScene(null)}
                className={`${buttonClass} ${activeSceneId === null ? activeClass : inactiveClass}`}
            >
                All
            </button>
            {scenes.map(scene => (
                <button
                    key={scene.id}
                    onClick={() => onSelectScene(scene.id)}
                    className={`${buttonClass} ${activeSceneId === scene.id ? activeClass : inactiveClass}`}
                >
                    {scene.name}
                </button>
            ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 w-full sm:w-auto">
        <button
          onClick={onToggleBgm}
          className="p-2 rounded-full text-stone-400 hover:bg-stone-700 hover:text-white transition-colors"
          aria-label={isBgmPlaying ? "Pause Background Music" : "Play Background Music"}
        >
          {isBgmPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="flex items-center gap-2 w-40">
          {bgmVolume > 0 ? <Volume2 size={20} className="text-stone-400"/> : <VolumeX size={20} className="text-stone-400"/>}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={bgmVolume}
            onChange={(e) => onBgmVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
        <AirPlayButton audioRef={airplayElement} />
        <button onClick={onLogout} className="p-2 rounded-full text-stone-400 hover:bg-stone-700 hover:text-white transition-colors">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};
