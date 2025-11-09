import React from 'react';
import { Airplay } from 'lucide-react';

interface AirPlayButtonProps {
  audioRef: HTMLAudioElement | null;
}

export const AirPlayButton: React.FC<AirPlayButtonProps> = ({ audioRef }) => {
  const handleAirPlayClick = () => {
    if (audioRef && (audioRef as any).webkitShowPlaybackTargetPicker) {
      (audioRef as any).webkitShowPlaybackTargetPicker();
    }
  };

  // The button should only be rendered on WebKit browsers (like Safari)
  // that support the AirPlay picker API.
  if (!audioRef || !(audioRef as any).webkitShowPlaybackTargetPicker) {
    return null;
  }

  return (
    <button onClick={handleAirPlayClick} className="p-2 rounded-full text-stone-400 hover:bg-stone-700 hover:text-white transition-colors" aria-label="AirPlay">
      <Airplay size={20} />
    </button>
  );
};