
import React from 'react';
import { Scene } from '../types';
import { Play, Pause, Volume2, VolumeX, LogOut, Library, StopCircle, Layers } from 'lucide-react';
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
  onOpenSceneManager: () => void;
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
  onOpenSceneManager,
  airplayElement,
  isPlayerVisible,
}) => {
  // "Liquid" button styles
  const baseButtonClass = "flex items-center justify-center transition-all duration-300 ease-out active:scale-95";
  
  const sceneButtonClass = `${baseButtonClass} px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap border hover:shadow-md hover:-translate-y-0.5`;
  const activeSceneClass = "bg-amber-600/90 text-white shadow-amber-900/20 border-amber-500/50 backdrop-blur-sm";
  const inactiveSceneClass = "bg-stone-800/40 text-stone-400 border-stone-700/50 hover:text-stone-100 hover:bg-stone-700/60 hover:border-stone-600";

  const controlButtonClass = `${baseButtonClass} p-2.5 rounded-xl text-stone-400 hover:text-amber-400 hover:bg-stone-700/50 hover:shadow-lg border border-transparent hover:border-stone-600/30`;

  return (
    <header className="sticky top-4 md:top-8 z-40 px-4 md:px-8 w-full flex justify-center mt-4 md:mt-8 mb-3 pointer-events-none transition-all duration-300">
      <div className="pointer-events-auto w-full bg-stone-800/80 backdrop-blur-xl border border-stone-700/50 shadow-2xl rounded-2xl p-2 sm:p-3 flex flex-col lg:flex-row items-center justify-between gap-4 transition-all duration-300">
        
        {/* Left: Scene Controls */}
        <div className="flex items-center w-full lg:w-auto gap-3 overflow-hidden">
           {/* Integrated Scene Manager Trigger */}
           <button
              onClick={onOpenSceneManager}
              className={`${baseButtonClass} flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900/60 border border-stone-700/50 text-stone-300 hover:text-amber-400 hover:border-amber-500/50 hover:bg-stone-800 hover:shadow-lg group`}
              title="Manage Scenes"
           >
               <Layers size={18} className="group-hover:scale-110 transition-transform duration-300 text-amber-600/80 group-hover:text-amber-400" />
               <span className="font-medieval font-bold text-lg pt-0.5">Scenes</span>
           </button>

            <div className="h-8 w-px bg-stone-700/50 hidden lg:block"></div>

            {/* Scrollable Scene List */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 w-full mask-linear-fade px-1">
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
        <div className="flex items-center gap-1 sm:gap-2 bg-stone-900/40 p-1.5 rounded-xl border border-stone-700/30 flex-shrink-0 shadow-inner">
             {/* Library Button */}
            <button
                onClick={onOpenSoundManager}
                className={controlButtonClass}
                title="Sound Library"
            >
                <Library size={20} />
            </button>

            <div className="h-6 w-px bg-stone-700/50 mx-1"></div>

            {/* Player Controls */}
            <div className={`flex items-center gap-2 transition-all duration-500 ease-out overflow-hidden ${isPlayerVisible ? 'max-w-screen-sm opacity-100' : 'max-w-0 opacity-0'}`}>
                <button
                  onClick={onToggleGlobalPlayPause}
                  className={`${baseButtonClass} p-2.5 rounded-xl bg-stone-800 text-stone-300 hover:bg-amber-600 hover:text-white transition-all border border-stone-700 hover:border-amber-500 shadow-sm hover:shadow-amber-900/20`}
                  aria-label={isAudioContextPlaying ? "Pause" : "Play"}
                >
                  {isAudioContextPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="ml-0.5 fill-current" />}
                </button>
                
                <button
                    onClick={onStopAllSounds}
                    className={`${baseButtonClass} p-2.5 rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 hover:shadow-red-900/20 hover:shadow-md`}
                    title="Stop All"
                >
                    <StopCircle size={20} />
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-2 px-2 w-28 sm:w-36 group/vol">
                  <div className="text-stone-500 group-hover/vol:text-stone-400 transition-colors">
                     {bgmVolume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={bgmVolume}
                    onChange={(e) => onBgmVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-600 hover:accent-amber-500 transition-all"
                  />
                </div>
                
                <div className="hover:scale-110 transition-transform">
                    <AirPlayButton audioRef={airplayElement} />
                </div>

                <div className="h-6 w-px bg-stone-700/50 mx-1"></div>
            </div>
            
            <button 
                onClick={onLogout} 
                className={`${controlButtonClass} hover:text-red-400 hover:bg-red-900/10`}
                title="Logout"
            >
              <LogOut size={20} />
            </button>
        </div>
      </div>
    </header>
  );
};
    