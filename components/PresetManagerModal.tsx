
import React, { useState } from 'react';
import { SoundboardPreset, Sound } from '../types';
import { X, Trash2, Edit, Plus } from 'lucide-react';
import { PresetEditor } from './PresetEditor';

interface PresetManagerModalProps {
  isOpen: boolean;
  presets: SoundboardPreset[];
  allSounds: Sound[];
  onClose: () => void;
  onCreatePreset: (name: string, soundIds: string[]) => Promise<void>;
  onUpdatePreset: (id: string, name: string, soundIds: string[]) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
  onLoadPreset: (id: string) => void;
}

export const PresetManagerModal: React.FC<PresetManagerModalProps> = ({ 
    isOpen, 
    presets, 
    allSounds,
    onClose, 
    onCreatePreset, 
    onUpdatePreset,
    onDeletePreset, 
    onLoadPreset 
}) => {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingPreset, setEditingPreset] = useState<SoundboardPreset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleCreateClick = () => {
    setEditingPreset(null);
    setView('create');
  };

  const handleEditClick = (preset: SoundboardPreset) => {
    setEditingPreset(preset);
    setView('edit');
  };

  const handleCancel = () => {
    setView('list');
    setEditingPreset(null);
  };
  
  const handleSave = async (name: string, soundIds: string[]) => {
      setIsSubmitting(true);
      if(view === 'create') {
          await onCreatePreset(name, soundIds);
      } else if (view === 'edit' && editingPreset) {
          await onUpdatePreset(editingPreset.id, name, soundIds);
      }
      setIsSubmitting(false);
      setView('list');
  }
  
  const handleDelete = async (id: string) => {
      if(window.confirm("Are you sure you want to delete this preset? This cannot be undone.")) {
          await onDeletePreset(id);
      }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-slate-800 rounded-lg p-8 w-full max-w-lg m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Manage Presets</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        
        {view === 'list' && (
            <>
            <div className="flex justify-end mb-4">
                 <button 
                    onClick={handleCreateClick} 
                    className="flex items-center gap-2 py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-500"
                    >
                    <Plus size={16}/> New Preset
                </button>
            </div>
            <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Your Presets</h3>
            <div className="max-h-80 overflow-y-auto pr-2">
                {presets.length === 0 ? (
                <p className="text-slate-400">You have no saved presets.</p>
                ) : (
                <ul className="space-y-2">
                    {presets.map(preset => (
                    <li key={preset.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md group">
                        <span className="text-white font-medium cursor-pointer hover:text-blue-400 transition-colors" onClick={() => { onLoadPreset(preset.id); onClose(); }}>{preset.name}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditClick(preset)} className="text-slate-400 hover:text-white">
                                <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(preset.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </li>
                    ))}
                </ul>
                )}
            </div>
            </div>
            <div className="flex justify-end pt-6">
                <button onClick={onClose} className="py-2 px-4 rounded-md text-white bg-slate-600 hover:bg-slate-500">Close</button>
            </div>
            </>
        )}
        {(view === 'create' || view === 'edit') && (
            <PresetEditor 
                preset={editingPreset || undefined}
                allSounds={allSounds}
                onSave={handleSave}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
            />
        )}
      </div>
    </div>
  );
};
