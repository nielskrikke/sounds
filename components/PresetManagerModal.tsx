import React, { useState, useEffect } from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <div className={`relative bg-stone-900/60 backdrop-blur-2xl border border-stone-700/50 shadow-2xl rounded-3xl p-8 w-full max-w-lg m-4 ${isOpen ? 'animate-modal-in' : 'animate-modal-out'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-medieval font-bold text-white drop-shadow-sm">Manage Presets</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors p-2 hover:bg-stone-700/50 rounded-full"><X size={24} /></button>
        </div>
        
        {view === 'list' && (
            <>
            <div className="flex justify-end mb-4">
                 <button 
                    onClick={handleCreateClick} 
                    className="flex items-center gap-2 py-2 px-4 rounded-xl text-white bg-amber-600 hover:bg-amber-500 shadow-lg hover:shadow-amber-900/20 transition-all"
                    >
                    <Plus size={16}/> New Preset
                </button>
            </div>
            <div className="space-y-2">
            <h3 className="text-xl font-medieval font-semibold text-white">Your Presets</h3>
            <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {presets.length === 0 ? (
                <p className="text-stone-400">You have no saved presets.</p>
                ) : (
                <ul className="space-y-2">
                    {presets.map(preset => (
                    <li key={preset.id} className="flex justify-between items-center bg-stone-800/50 hover:bg-stone-700/50 border border-stone-700/30 p-3 rounded-xl group transition-colors">
                        <span className="text-white font-medium cursor-pointer hover:text-amber-400 transition-colors" onClick={() => { onLoadPreset(preset.id); onClose(); }}>{preset.name}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditClick(preset)} className="text-stone-400 hover:text-white p-2 hover:bg-stone-600 rounded-full transition-colors">
                                <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(preset.id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-stone-600 rounded-full transition-colors">
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
                <button onClick={onClose} className="py-2 px-4 rounded-xl text-stone-300 hover:text-white hover:bg-stone-700/50 transition-colors">Close</button>
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