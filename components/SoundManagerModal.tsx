import React from 'react';
import { Sound } from '../types';
import { X, Edit, Trash2, Plus } from 'lucide-react';

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
}> = ({ title, sounds, onEditSound, onDeleteSound }) => {
  if (sounds.length === 0) return null;

  return (
    <section className="mb-4 last:mb-0">
      <h3 className="text-xl font-medieval text-amber-400 mb-2 sticky top-0 bg-stone-800 py-1 z-10">{title}</h3>
      <ul className="space-y-2">
        {sounds.map(sound => (
          <li key={sound.id} className="flex justify-between items-center bg-stone-700 p-3 rounded-md group">
            <div className="truncate pr-4">
              <p className="text-white font-medium truncate">{sound.name}</p>
              <p className="text-xs text-stone-400 truncate">Scenes: {sound.include_in_all_scenes ? 'All' : sound.scenes?.map(s => s.name).join(', ') || 'None'}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => onEditSound(sound)} className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-600 transition-colors" aria-label={`Edit ${sound.name}`}>
                <Edit size={18} />
              </button>
              <button onClick={() => onDeleteSound(sound)} className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-stone-600 transition-colors" aria-label={`Delete ${sound.name}`}>
                <Trash2 size={18} />
              </button>
            </div>
          </li>
        ))}
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
  if (!isOpen) return null;

  const ambienceSounds = sounds.filter(s => s.type === 'Ambience');
  const bgmSounds = sounds.filter(s => s.type === 'Background Music');
  const sfxSounds = sounds.filter(s => s.type === 'One-shots');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-stone-800 rounded-lg p-8 w-full max-w-2xl m-4 flex flex-col" style={{maxHeight: '90vh'}}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-medieval font-bold text-white">Manage Sounds</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={24} /></button>
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={onAddSound} className="flex items-center gap-2 py-2 px-4 rounded-md text-white bg-amber-600 hover:bg-amber-500">
            <Plus size={16}/> Add New Sound
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          {sounds.length === 0 ? (
            <p className="text-stone-400 text-center py-8">Your sound library is empty. Add a sound to get started!</p>
          ) : (
            <div>
              <SoundListSection title="Ambience" sounds={ambienceSounds} onEditSound={onEditSound} onDeleteSound={onDeleteSound} />
              <SoundListSection title="Background Music" sounds={bgmSounds} onEditSound={onEditSound} onDeleteSound={onDeleteSound} />
              <SoundListSection title="One-shots" sounds={sfxSounds} onEditSound={onEditSound} onDeleteSound={onDeleteSound} />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6">
          <button onClick={onClose} className="py-2 px-4 rounded-md text-white bg-stone-600 hover:bg-stone-500">Close</button>
        </div>
      </div>
    </div>
  );
};