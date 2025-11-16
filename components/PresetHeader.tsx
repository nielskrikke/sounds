import React from 'react';
import { Scene } from '../types';
import { Play, Pause, Volume2, VolumeX, LogOut, Library, StopCircle } from 'lucide-react';
import { AirPlayButton } from './AirPlayButton';

interface SceneHeaderProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onSelectScene: (id: string | null) => void;
  isAudioContextPlaying: boolean;
  onToggleGlobalPlayPause: () => void;
  onStopAllSounds: () => void;
  bgmVolume: number;
  onBgmVolumeChange: (volume: number) => void;
  onLogout: () => void;
  onOpenSoundManager: () => void;
  airplayElement: HTMLAudioElement | null;
  isPlayerVisible: boolean;
}

export const SceneHeader: React.FC<SceneHeaderProps> = ({
  scenes,
  activeSceneId,
  onSelectScene,
  isAudioContextPlaying,
  onToggleGlobalPlayPause,
  onStopAllSounds,
  bgmVolume,
  onBgmVolumeChange,
  onLogout,
  onOpenSoundManager,
  airplayElement,
  isPlayerVisible,
}) => {
  const sceneButtonClass = "px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap";
  const activeSceneClass = "bg-amber-600 text-white";
  const inactiveSceneClass = "bg-stone-700 text-stone-300 hover:bg-stone-600";

  return (
    <header className="bg-stone-800/50 backdrop-blur-sm sticky top-0 z-20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-700">
      {/* Left: Scene Controls */}
      <div className="flex items-center gap-2 bg-stone-900/50 p-2 rounded-lg w-full sm:w-auto overflow-x-auto">
         <span className="text-sm font-medieval text-white mr-2 flex-shrink-0">Scenes:</span>
          <div className="flex items-center gap-2">
              <button
                  onClick={() => onSelectScene(null)}
                  className={`${sceneButtonClass} ${activeSceneId === null ? activeSceneClass : inactiveSceneClass}`}
              >
                  All
              </button>
              {scenes.map(scene => (
                  <button
                      key={scene.id}
                      onClick={() => onSelectScene(scene.id)}
                      className={`${sceneButtonClass} ${activeSceneId === scene.id ? activeSceneClass : inactiveSceneClass}`}
                  >
                      {scene.name}
                  </button>
              ))}
          </div>
      </div>
      
      {/* Right: Player & Action Controls */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
          <button
              onClick={onOpenSoundManager}
              className="p-2 rounded-full text-white bg-amber-600 hover:bg-amber-500 transition-colors"
              aria-label="Manage Sound Library"
          >
              <Library size={20} />
          </button>

          <div className={`flex items-center gap-4 transition-all duration-300 ease-in-out overflow-hidden ${isPlayerVisible ? 'max-w-md opacity-100' : 'max-w-0 opacity-0'}`}>
              <div className="flex items-center gap-2 md:gap-4 flex-nowrap bg-stone-900/50 p-1 rounded-lg">
                  <button
                    onClick={onToggleGlobalPlayPause}
                    className="p-2 rounded-full text-stone-400 hover:bg-stone-700 hover:text-white transition-colors"
                    aria-label={isAudioContextPlaying ? "Pause All Audio" : "Play All Audio"}
                  >
                    {isAudioContextPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button
                      onClick={onStopAllSounds}
                      className="p-2 rounded-full text-stone-400 hover:bg-red-800/50 hover:text-white transition-colors"
                      aria-label="Stop All Sounds"
                  >
                      <StopCircle size={20} />
                  </button>
                  <div className="flex items-center gap-2 w-32 md:w-40">
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
              </div>
          </div>
          
          <button onClick={onLogout} className="p-2 rounded-full text-stone-400 hover:bg-stone-700 hover:text-white transition-colors">
            <LogOut size={20} />
          </button>
      </div>
    </header>
  );
};
