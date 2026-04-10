
import React from 'react';
import { AtmosphereLevel } from '../types';
import { Zap, Shield, Coffee } from 'lucide-react';

interface AtmosphereFooterProps {
  activeAtmosphere: AtmosphereLevel | null;
  onSelectAtmosphere: (atmosphere: AtmosphereLevel) => void;
  isSceneActive: boolean;
}

const atmosphereConfig: { [key in AtmosphereLevel]: { icon: React.ReactNode; color: string; } } = {
  'Relaxed': { icon: <Coffee size={16} />, color: 'bg-green-600 hover:bg-green-500 text-white' },
  'Neutral': { icon: <Shield size={16} />, color: 'bg-sky-600 hover:bg-sky-500 text-white' },
  'Intense': { icon: <Zap size={16} />, color: 'bg-red-600 hover:bg-red-500 text-white' },
};

export const AtmosphereFooter: React.FC<AtmosphereFooterProps> = ({ activeAtmosphere, onSelectAtmosphere, isSceneActive }) => {
  const containerClasses = `fixed bottom-4 left-4 z-30 transition-opacity duration-300 opacity-100`;
  
  return (
    <div className={containerClasses}>
      <div className={`flex items-center gap-2 bg-dnd-panel/80 backdrop-blur-md p-2 rounded-xl border border-white/5 shadow-lg`}>
        <span className="text-sm font-serif font-bold text-dnd-gold ml-2 mr-1 flex-shrink-0 hidden sm:inline">Atmosphere:</span>
        <div className="flex items-center gap-2">
            {(['Relaxed', 'Neutral', 'Intense'] as AtmosphereLevel[]).map(level => {
                const config = atmosphereConfig[level];
                const isActive = activeAtmosphere === level;
                return (
                    <button 
                        key={level} 
                        onClick={() => onSelectAtmosphere(level)} 
                        className={`flex items-center justify-center gap-2 px-2 sm:px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${isActive ? `bg-dnd-gold text-black shadow-lg ring-2 ring-dnd-gold/50` : 'bg-white/5 hover:bg-white/10 text-dnd-text/60 hover:text-dnd-gold'}`}
                        title={level}
                    >
                        {config.icon} <span className="hidden sm:inline ml-1.5">{level}</span>
                    </button>
                );
            })}
        </div>
      </div>
    </div>
  );
};
