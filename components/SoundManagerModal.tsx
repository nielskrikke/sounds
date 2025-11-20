
import React, { useState, useEffect } from 'react';
import { Sound } from '../types';
import { X, Edit, Trash2, Plus, AlertTriangle } from 'lucide-react';

interface SoundManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sounds: Sound[];
  onAddSound: () => void;
  onEditSound: (sound: Sound) => void;
  onDeleteSound: (sound: Sound) => void;
}

const SoundListSection: React.FC<{
  title: string;
  sounds: Sound[];
  onEditSound: (sound: Sound) => void;
  onDeleteSound: (sound: Sound) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
}> = ({ title, sounds, onEditSound, onDeleteSound, confirmDeleteId, setConfirmDeleteId }) => {
  if (sounds.length === 0) return null;

  return (
    <section className="mb-4 last:mb-0">
      <h3 className="text-xl font-medieval text-amber-400 mb-2 py-2">{title}</h3>
      <ul className="space-y-2">
        {sounds.map(sound => {
          const isConfirming = confirmDeleteId === sound.id;
          return (
            <li key={sound.id} className="flex justify-between items-center bg-stone-800/50 hover:bg-stone-700/50 border border-stone-700/30 p-3 rounded-xl group min-h-[4.5rem] transition-all duration-200">
              <div className="truncate pr-4 flex-grow">
                <p className="text-white font-medium truncate">{sound.name}</p>
                <p className="text-xs text-stone-400 truncate">Scenes: {sound.include_in_all_scenes ? 'All' : sound.scenes?.map(s => s.name).join(', ') || 'None'}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isConfirming && (
                   <button onClick={() => onEditSound(sound)} className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-600 transition-colors" aria-label={`Edit ${sound.name}`}>
                      <Edit size={18} />
                    </button>
                )}
                <button 
                    onClick={() => {
                        if (isConfirming) {
                            onDeleteSound(sound);
                            setConfirmDeleteId(null);
                        } else {
                            setConfirmDeleteId(sound.id);
                        }
                    }}
                    className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
                        isConfirming 
                        ? "bg-red-600 text-white hover:bg-red-700 px-4 py-2 w-auto rounded-md animate-pulse" 
                        : "text-red-400 hover:text-red-300 hover:bg-stone-600"
                    }`}
                    aria-label={isConfirming ? "Confirm Delete" : "Delete Sound"}
                >
                  {isConfirming ? (
                      <>
                        <AlertTriangle size={16} />
                        <span className="text-sm font-bold whitespace-nowrap">Confirm Delete</span>
                      </>
                  ) : (
                      <Trash2 size={18} />
                  )}
                </button>
                {isConfirming && (
                    <button 
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const SoundManagerModal: React.FC<SoundManagerModalProps> = ({
  isOpen,
  onClose,
  sounds,
  onAddSound,
  onEditSound,
  onDeleteSound,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
      if (isOpen) {
          setShowModal(true);
      } else {
          // Sync with modal-out duration (100ms)
          const timer = setTimeout(() => setShowModal(false), 100);
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  if (!showModal) return null;

  const ambienceSounds = sounds.filter(s => s.type === 'Ambience');
  const bgmSounds = sounds.filter(s => s.type === 'Background Music');
  const sfxSounds = sounds.filter(s => s.type === 'One-shots');

  const handleClose = () => {
      setConfirmDeleteId(null);
      onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className={`absolute inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      <div className={`relative bg-stone-900/60 backdrop-blur-2xl border border-stone-700/50 shadow-2xl rounded-3xl p-8 w-full max-w-2xl m-4 flex flex-col max-h-[90vh] ${isOpen ? 'animate-modal-in' : 'animate-modal-out'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-medieval font-bold text-white drop-shadow-sm">Manage Sounds</h2>
          <button onClick={handleClose} className="text-stone-400 hover:text-white transition-colors p-2 hover:bg-stone-700/50 rounded-full"><X size={24} /></button>
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={onAddSound} className="flex items-center gap-2 py-2 px-4 rounded-xl text-white bg-amber-600 hover:bg-amber-500 shadow-lg hover:shadow-amber-900/20 transition-all">
            <Plus size={16}/> Add New Sound
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar" onClick={(e) => {
            // If clicking on the background (not a button), reset confirmation
            if (e.target === e.currentTarget) setConfirmDeleteId(null);
        }}>
          {sounds.length === 0 ? (
            <p className="text-stone-400 text-center py-8">Your sound library is empty. Add a sound to get started!</p>
          ) : (
            <div>
              <SoundListSection 
                title="Ambience" 
                sounds={ambienceSounds} 
                onEditSound={onEditSound} 
                onDeleteSound={onDeleteSound}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
              />
              <SoundListSection 
                title="Background Music" 
                sounds={bgmSounds} 
                onEditSound={onEditSound} 
                onDeleteSound={onDeleteSound}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
              />
              <SoundListSection 
                title="One-shots" 
                sounds={sfxSounds} 
                onEditSound={onEditSound} 
                onDeleteSound={onDeleteSound}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6">
          <button onClick={handleClose} className="py-2 px-4 rounded-xl text-stone-300 hover:text-white hover:bg-stone-700/50 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};
