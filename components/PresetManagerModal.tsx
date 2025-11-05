
import React, { useState } from 'react';
import { SoundboardPreset } from '../types';
import { X, Trash2 } from 'lucide-react';

interface PresetManagerModalProps {
  isOpen: boolean;
  presets: SoundboardPreset[];
  onClose: () => void;
  onCreatePreset: (name: string) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
  onLoadPreset: (id: string) => void;
}

export const PresetManagerModal: React.FC<PresetManagerModalProps> = ({ isOpen, presets, onClose, onCreatePreset, onDeletePreset, onLoadPreset }) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) return;
    setIsSubmitting(true);
    await onCreatePreset(newPresetName.trim());
    setNewPresetName('');
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-slate-800 rounded-lg p-8 w-full max-w-lg m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Manage Presets</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-white">Create New Preset</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset Name (e.g., Tavern Night)"
              className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
            />
            <button 
              onClick={handleCreatePreset} 
              disabled={isSubmitting || !newPresetName.trim()}
              className="py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-500 disabled:bg-slate-500"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Your Presets</h3>
          <div className="max-h-60 overflow-y-auto pr-2">
            {presets.length === 0 ? (
              <p className="text-slate-400">You have no saved presets.</p>
            ) : (
              <ul className="space-y-2">
                {presets.map(preset => (
                  <li key={preset.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                    <span className="text-white font-medium cursor-pointer" onClick={() => { onLoadPreset(preset.id); onClose(); }}>{preset.name}</span>
                    <button onClick={() => onDeletePreset(preset.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex justify-end pt-6">
           <button onClick={onClose} className="py-2 px-4 rounded-md text-white bg-slate-600 hover:bg-slate-500">Close</button>
        </div>
      </div>
    </div>
  );
};
