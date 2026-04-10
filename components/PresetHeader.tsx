
import React from 'react';
import { Scene } from '../types';
import { Play, Pause, Volume2, VolumeX, LogOut, Library, StopCircle, Layers, ChevronDown } from 'lucide-react';
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
  
  const sceneButtonClass = `${baseButtonClass} px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap border transition-all`;
  const activeSceneClass = "bg-dnd-gold text-black border-dnd-gold shadow-[0_0_15px_rgba(201,173,106,0.3)]";
  const inactiveSceneClass = "bg-white/5 text-dnd-text/60 border-white/5 hover:text-dnd-gold hover:bg-white/10 hover:border-white/10";

  const controlButtonClass = `${baseButtonClass} p-2.5 rounded-xl text-dnd-text/40 hover:text-dnd-gold hover:bg-white/5 border border-transparent hover:border-white/10`;

  return (
    <header className="sticky top-4 md:top-8 z-40 px-4 md:px-8 w-full flex justify-center mt-4 md:mt-8 mb-3 pointer-events-none transition-all duration-300">
      <div className="pointer-events-auto w-full bg-dnd-panel/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-2 sm:p-3 flex flex-col lg:flex-row items-center justify-between gap-2 sm:gap-4 transition-all duration-300">
        
        {/* Left: Scene Controls */}
        <div className="flex items-center w-full lg:w-auto gap-2 sm:gap-3 overflow-hidden">
            {/* Scenes Title */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 sm:px-4">
                <span className="font-serif font-bold text-lg pt-0.5 text-dnd-gold drop-shadow-sm">Scenes</span>
            </div>

           {/* Mobile Scene Selector (Dropdown) */}
            <div className="relative flex-grow md:hidden h-full group">
                <select
                    value={activeSceneId ?? ""}
                    onChange={(e) => onSelectScene(e.target.value === "" ? null : e.target.value)}
                    className="w-full h-full appearance-none bg-black/40 border border-white/5 text-dnd-text/60 text-sm font-medium rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-dnd-gold/30 transition-colors"
                >
                    <option value="">All Scenes</option>
                    {scenes.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dnd-text/40 group-hover:text-dnd-gold transition-colors">
                    <ChevronDown size={16} />
                </div>
            </div>

            <div className="h-8 w-px bg-white/5 hidden lg:block"></div>

            {/* Desktop Scrollable Scene List */}
            <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar py-2 w-full mask-linear-fade px-1">
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
        <div className="flex items-center gap-1 sm:gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5 flex-shrink-0 shadow-inner">
             {/* Scene Manager Button */}
             <button
                onClick={onOpenSceneManager}
                className={controlButtonClass}
                title="Manage Scenes"
            >
                <Layers size={20} />
            </button>

             {/* Library Button */}
            <button
                onClick={onOpenSoundManager}
                className={controlButtonClass}
                title="Sound Library"
            >
                <Library size={20} />
            </button>

            <div className="h-6 w-px bg-white/5 mx-1"></div>

            {/* Player Controls */}
            <div className={`flex items-center gap-2 transition-all duration-500 ease-out overflow-hidden ${isPlayerVisible ? 'max-w-screen-sm opacity-100' : 'max-w-0 opacity-0'}`}>
                <button
                  onClick={onToggleGlobalPlayPause}
                  className={`${baseButtonClass} p-2.5 rounded-xl bg-white/5 text-dnd-text/60 hover:bg-dnd-gold hover:text-black transition-all border border-white/5 hover:border-dnd-gold shadow-sm`}
                  aria-label={isAudioContextPlaying ? "Pause" : "Play"}
                >
                  {isAudioContextPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="ml-0.5 fill-current" />}
                </button>
                
                <button
                    onClick={onStopAllSounds}
                    className={`${baseButtonClass} p-2.5 rounded-xl text-dnd-red/60 hover:bg-dnd-red/10 hover:text-dnd-red hover:shadow-dnd-red/20 shadow-sm`}
                    title="Stop All"
                >
                    <StopCircle size={20} />
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-2 px-2 w-20 sm:w-36 group/vol">
                  <div className="text-dnd-text/40 group-hover/vol:text-dnd-gold transition-colors hidden sm:block">
                     {bgmVolume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={bgmVolume}
                    onChange={(e) => onBgmVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-dnd-gold hover:accent-dnd-gold transition-all"
                  />
                </div>
                
                <div className="hover:scale-110 transition-transform">
                    <AirPlayButton audioRef={airplayElement} />
                </div>

                <div className="h-6 w-px bg-white/5 mx-1"></div>
            </div>
            
            <button 
                onClick={onLogout} 
                className={`${controlButtonClass} hover:text-dnd-red hover:bg-dnd-red/10`}
                title="Logout"
            >
              <LogOut size={20} />
            </button>
        </div>
      </div>
    </header>
  );
};
