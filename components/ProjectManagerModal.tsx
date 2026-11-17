import React, { useState } from 'react';
import { FolderKanban, Plus, Trash2, Check, Edit2, X } from 'lucide-react';
import { Language, ProjectWorkspace } from '../types';
import { translations, getDir } from '../utils/translations';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  projects: ProjectWorkspace[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  lang,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject
}) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!isOpen) return null;

  const t = translations[lang];
  const dir = getDir(lang);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateProject(trimmed);
    setNewName('');
  };

  return (
    <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir={dir}>
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <FolderKanban className="text-blue-400" size={20} />
            {t.manageProjects}
          </div>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-4 border-b bg-slate-50 flex gap-2 shrink-0">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.projectName}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-blue-500"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={16} />
            {t.create}
          </button>
        </form>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {projects.map((p) => {
            const isActive = p.id === activeProjectId;
            const isEditing = editingId === p.id;
            return (
              <div
                key={p.id}
                className={`border rounded-xl p-3 flex items-center justify-between gap-2 transition-colors ${
                  isActive ? 'border-blue-500 bg-blue-50/70' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 border border-blue-400 rounded px-2 py-1 text-sm bg-white focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editValue.trim()) {
                            onRenameProject(p.id, editValue.trim());
                            setEditingId(null);
                          } else if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (editValue.trim()) onRenameProject(p.id, editValue.trim());
                          setEditingId(null);
                        }}
                        className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onSelectProject(p.id);
                        onClose();
                      }}
                      className="w-full text-start flex flex-col"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 truncate">{p.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                            {t.active}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        {p.nodes.length} nodes • {p.edges.length} edges
                      </span>
                    </button>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setEditValue(p.name);
                      }}
                      className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg"
                      title={t.rename}
                    >
                      <Edit2 size={15} />
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={() => onDeleteProject(p.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg"
                        title={t.delete}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
