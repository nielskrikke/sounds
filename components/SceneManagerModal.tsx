import React, { useState, useEffect } from 'react';
import { Scene } from '../types';
import { X, Plus, Trash2, Layers, AlertTriangle, Check } from 'lucide-react';

interface SceneManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  onAddScene: (name: string) => Promise<void>;
  onRemoveScene: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export const SceneManagerModal: React.FC<SceneManagerModalProps> = ({
  isOpen,
  onClose,
  scenes,
  onAddScene,
  onRemoveScene,
}) => {
  const [newSceneName, setNewSceneName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSceneName.trim()) return;
    
    if (scenes.some(s => s.name.toLowerCase() === newSceneName.trim().toLowerCase())) {
        setError('A scene with this name already exists.');
        return;
    }

    setIsSubmitting(true);
    setError(null);
    await onAddScene(newSceneName);
    setNewSceneName('');
    setIsSubmitting(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (confirmDeleteId === id) {
          executeDelete(id);
      } else {
          setConfirmDeleteId(id);
      }
  };

  const executeDelete = async (id: string) => {
      setError(null);
      const result = await onRemoveScene(id);
      if (!result.success) {
          setError(result.error || "Failed to delete scene.");
      }
      setConfirmDeleteId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setConfirmDeleteId(null);
  };

  const handleClose = () => {
      setConfirmDeleteId(null);
      setError(null);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      
      <div 
        className={`relative bg-stone-900/60 backdrop-blur-2xl border border-stone-700/50 shadow-2xl rounded-3xl p-6 w-full max-w-md m-4 max-h-[90vh] flex flex-col ${isOpen ? 'animate-modal-in' : 'animate-modal-out'}`}
        onClick={() => setConfirmDeleteId(null)} // Background click cancels confirmation
      >
        <div className="flex justify-between items-center mb-6" onClick={e => e.stopPropagation()}>
          <h2 className="text-2xl font-medieval font-bold text-white flex items-center gap-2 drop-shadow-sm">
              <Layers className="text-amber-500" size={24} /> Manage Scenes
          </h2>
          <button onClick={handleClose} className="p-2 text-stone-400 hover:text-white hover:bg-stone-700/50 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleAdd} className="mb-6" onClick={e => e.stopPropagation()}>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={newSceneName}
                    onChange={(e) => setNewSceneName(e.target.value)}
                    placeholder="New Scene Name"
                    className="flex-1 bg-stone-800/40 border border-stone-600/50 rounded-xl p-3 text-white placeholder-stone-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                    autoFocus
                />
                <button 
                    type="submit" 
                    disabled={isSubmitting || !newSceneName.trim()}
                    className="bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-xl disabled:bg-stone-700 disabled:text-stone-500 transition-all shadow-lg hover:shadow-amber-900/20"
                >
                    <Plus size={20} />
                </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm mt-3 bg-red-900/20 p-3 rounded-lg border border-red-800/50 animate-pulse">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
        </form>

        <div className="flex-grow overflow-y-auto bg-stone-900/30 rounded-xl border border-stone-700/30 p-2 custom-scrollbar" onClick={e => e.stopPropagation()}>
            {scenes.length === 0 ? (
                <p className="text-stone-500 text-center py-8 italic">No scenes created yet.</p>
            ) : (
                <ul className="space-y-2">
                    {scenes.map(scene => {
                        const isConfirming = confirmDeleteId === scene.id;
                        return (
                            <li 
                                key={scene.id} 
                                className={`flex justify-between items-center p-3 rounded-lg transition-all duration-200 border ${isConfirming ? 'bg-red-900/10 border-red-900/30' : 'bg-stone-800/50 border-transparent hover:bg-stone-700/50 hover:border-stone-600/50'}`}
                            >
                                <span className={`font-medium truncate pr-2 transition-colors ${isConfirming ? 'text-red-200' : 'text-stone-200'}`}>
                                    {scene.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={(e) => handleDeleteClick(e, scene.id)}
                                        className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm ${
                                            isConfirming 
                                            ? "bg-red-600 text-white hover:bg-red-500 hover:shadow-red-900/30 scale-105" 
                                            : "text-stone-400 hover:text-red-400 hover:bg-stone-700 bg-stone-800 border border-stone-700"
                                        }`}
                                    >
                                        {isConfirming ? (
                                            <>
                                                <Check size={16} strokeWidth={3} />
                                                <span className="text-xs font-bold uppercase tracking-wider">Confirm</span>
                                            </>
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                    
                                    {isConfirming && (
                                        <button
                                            type="button"
                                            onClick={cancelDelete}
                                            className="text-stone-400 hover:text-stone-200 p-1.5 hover:bg-stone-700 rounded-lg transition-colors"
                                            title="Cancel"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>

        <div className="mt-6 flex justify-end" onClick={e => e.stopPropagation()}>
            <button onClick={handleClose} className="py-2 px-6 rounded-xl text-stone-300 hover:text-white bg-stone-700 hover:bg-stone-600 transition-all">Close</button>
        </div>
      </div>
    </div>
  );
};