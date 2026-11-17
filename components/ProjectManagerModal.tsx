import React, { useRef, useState } from 'react';
import { FolderKanban, Plus, Trash2, Check, Edit2, X, Download, Upload, LayoutTemplate } from 'lucide-react';
import { Language, ProjectWorkspace } from '../types';
import { translations, getDir } from '../utils/translations';
import { STARTER_TEMPLATES, StarterTemplateId } from '../utils/starterTemplates';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  projects: ProjectWorkspace[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, templateId?: StarterTemplateId) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
  onBackupAll: () => void;
  onRestoreAll: (file: File) => void;
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
  onDeleteProject,
  onBackupAll,
  onRestoreAll
}) => {
  const [newName, setNewName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<StarterTemplateId>('blank');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const t = translations[lang];
  const dir = getDir(lang);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateProject(trimmed, selectedTemplate);
    setNewName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir={dir}>
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <FolderKanban className="text-blue-400" size={20} />
            {t.manageProjects}
          </div>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-4 border-b bg-slate-50 flex flex-col gap-2.5 shrink-0">
          <div className="flex gap-2">
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
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 shrink-0">
              <LayoutTemplate size={13} className="text-blue-600" />
              <span>{t.templateLabel}:</span>
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as StarterTemplateId)}
              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-blue-500"
            >
              {STARTER_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl[lang].name} — {tpl[lang].desc}
                </option>
              ))}
            </select>
          </div>
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
                      <span className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                        {p.nodes.length} {t.nodesCount} · {p.edges.length} {t.edgesCount}
                      </span>
                    </button>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    {confirmingDeleteId === p.id ? (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteProject(p.id);
                            setConfirmingDeleteId(null);
                          }}
                          className="text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded"
                        >
                          {t.confirmDeleteAction}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          className="text-[11px] font-medium text-slate-600 hover:text-slate-800 px-1.5 py-0.5 rounded"
                        >
                          {t.cancelAction}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setEditValue(p.name);
                            setConfirmingDeleteId(null);
                          }}
                          className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg"
                          title={t.rename}
                        >
                          <Edit2 size={15} />
                        </button>
                        {projects.length > 1 && (
                          <button
                            onClick={() => setConfirmingDeleteId(p.id)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg"
                            title={t.delete}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onBackupAll}
            className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download size={14} /> {t.backupAll}
          </button>
          <button
            type="button"
            onClick={() => restoreInputRef.current?.click()}
            className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Upload size={14} /> {t.restoreAll}
          </button>
          <input
            ref={restoreInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onRestoreAll(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
};
