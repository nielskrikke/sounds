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
  'Combat': { icon: <Zap size={16} />, color: 'bg-red-600 hover:bg-red-500 text-white' },
};

export const AtmosphereFooter: React.FC<AtmosphereFooterProps> = ({ activeAtmosphere, onSelectAtmosphere, isSceneActive }) => {
  const containerClasses = `fixed bottom-4 left-4 z-30 transition-opacity duration-300 ${isSceneActive ? 'opacity-100' : 'opacity-50'}`;
  const tooltip = !isSceneActive ? "Select a scene to use atmospheres" : undefined;
  
  return (
    <div className={containerClasses} title={tooltip}>
      <div className={`flex items-center gap-2 bg-stone-800/80 backdrop-blur-sm p-2 rounded-xl border border-stone-700 shadow-lg ${!isSceneActive ? 'pointer-events-none' : ''}`}>
        <span className="text-sm font-medieval text-white ml-2 mr-1 flex-shrink-0">Atmosphere:</span>
        <div className="flex items-center gap-2">
            {(['Relaxed', 'Neutral', 'Combat'] as AtmosphereLevel[]).map(level => {
                const config = atmosphereConfig[level];
                const isActive = activeAtmosphere === level;
                return (
                    <button 
                        key={level} 
                        onClick={() => onSelectAtmosphere(level)} 
                        className={`flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${isActive ? `${config.color} shadow-lg ring-2 ring-white/50` : 'bg-stone-700 hover:bg-stone-600 text-stone-300'}`}
                        disabled={!isSceneActive}
                    >
                        {config.icon} {level}
                    </button>
                );
            })}
        </div>
      </div>
    </div>
  );
};
