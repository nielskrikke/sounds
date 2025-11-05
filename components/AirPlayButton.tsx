
import React, { useEffect, useState } from 'react';
import { Airplay } from 'lucide-react';

interface AirPlayButtonProps {
  audioRef: HTMLAudioElement | null;
}

declare global {
    interface Window {
        WebKitPlaybackTargetAvailabilityEvent: any;
    }
}

export const AirPlayButton: React.FC<AirPlayButtonProps> = ({ audioRef }) => {
  const [isAirPlayAvailable, setAirPlayAvailable] = useState(false);

  useEffect(() => {
    // This is a WebKit-specific feature (primarily for Safari)
    if (window.WebKitPlaybackTargetAvailabilityEvent && audioRef) {
      const handleAvailabilityChange = (event: any) => {
          setAirPlayAvailable(event.availability === 'available');
      };
      
      audioRef.addEventListener('webkitplaybacktargetavailabilitychanged', handleAvailabilityChange);

      return () => {
          audioRef.removeEventListener('webkitplaybacktargetavailabilitychanged', handleAvailabilityChange);
      };
    }
  }, [audioRef]);

  const handleAirPlayClick = () => {
    if (audioRef && (audioRef as any).webkitShowPlaybackTargetPicker) {
      (audioRef as any).webkitShowPlaybackTargetPicker();
    }
  };

  if (!isAirPlayAvailable) {
    return null;
  }

  return (
    <button onClick={handleAirPlayClick} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" aria-label="AirPlay">
      <Airplay size={20} />
    </button>
  );
};
