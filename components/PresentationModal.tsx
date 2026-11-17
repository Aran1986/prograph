import React, { useState, useEffect, useRef } from 'react';
import {
  Layers, Loader2, X, RefreshCw, Save, Edit, Bot, ImagePlus, Check, Trash2,
  GripVertical, Undo2, Redo2, Bold, Italic, List, Code, Upload, Quote
} from 'lucide-react';
import { AttachedFile, Language, ChatMessage, GraphNodeData, GraphEdgeData } from '../types';
import { translations, getDir } from '../utils/translations';
import { ChatWidget } from './ChatWidget';
import { chatWithAI, generateImage } from '../services/ai';

interface PresentationModalProps {
  isOpen: boolean;
  isLoading: boolean;
  content: string;
  files: AttachedFile[];
  targetLanguage: Language;
  activeItemId: string | null;
  modeTitle?: string;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  onClose: () => void;
  onRegenerate: (lang: Language) => void;
  onSaveContent: (newContent: string, itemId?: string) => void;
  uiLang: Language;
  onAddFile: (file: AttachedFile, itemId: string) => void;
  onRemoveFile: (fileId: string, itemId: string) => void;
  onCreateNodeFromChat?: (title: string, content: string, parentItemId?: string | null) => void;
  onNotify: (message: string, type?: 'error' | 'success' | 'info') => void;
}

const AIImagePlaceholder: React.FC<{
  prompt: string;
  uiLang: Language;
  onConfirm: (base64: string) => void;
  onNotify: (message: string, type?: 'error' | 'success' | 'info') => void;
}> = ({ prompt, uiLang, onConfirm, onNotify }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = translations[uiLang];

  const generate = async () => {
    setLoading(true);
    try {
      const result = await generateImage(prompt);
      if (result) {
        setImage(result);
      }
    } catch (err: any) {
      onNotify(err?.message || 'Image generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-6 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 p-4 relative group transition-all hover:border-blue-400 shadow-sm">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
          <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
          <span className="text-sm font-bold animate-pulse">{t.creatingVisuals}</span>
        </div>
      ) : image ? (
        <div className="relative flex flex-col gap-3">
          <img src={image} alt={prompt} className="w-full h-auto object-cover max-h-[400px] rounded-lg shadow-md" />
          <div className="flex items-center justify-center gap-4 mt-2 bg-white p-2 rounded-lg border shadow-sm">
            <button
              onClick={() => onConfirm(image)}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg shadow transition-transform hover:scale-105 flex items-center gap-2"
            >
              <Check size={20} />
              <span className="font-bold">{t.insertImage}</span>
            </button>
            <div className="w-px h-8 bg-gray-300 mx-2" />
            <button
              onClick={generate}
              className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={18} />
              <span>{t.retry}</span>
            </button>
            <button
              onClick={() => setImage(null)}
              className="text-gray-700 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash2 size={18} />
              <span>{t.delete}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center gap-4 text-gray-500">
          <div className="text-sm italic bg-white px-4 py-2 rounded border shadow-sm max-w-[90%] text-center">
            {t.promptLabel} {prompt}
          </div>
          <button
            onClick={generate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full font-bold text-sm transition-colors shadow-md hover:shadow-lg"
          >
            <ImagePlus size={20} />
            {t.generateAiImage}
          </button>
        </div>
      )}
    </div>
  );
};

export const PresentationModal: React.FC<PresentationModalProps> = ({
  isOpen,
  isLoading,
  content,
  files,
  targetLanguage,
  activeItemId,
  modeTitle,
  nodes,
  edges,
  onClose,
  onRegenerate,
  onSaveContent,
  uiLang,
  onAddFile,
  onRemoveFile,
  onCreateNodeFromChat,
  onNotify
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatByItem, setChatByItem] = useState<Record<string, ChatMessage[]>>({});
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(content);

  const editorRef = useRef<HTMLDivElement>(null);
  const galleryUploadRef = useRef<HTMLInputElement>(null);
  const t = translations[uiLang];

  const messages = activeItemId ? chatByItem[activeItemId] || [] : [];

  useEffect(() => {
    setLocalContent(content);
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [content, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmImage = (originalTag: string, base64: string) => {
    if (!activeItemId) return;

    const newFile: AttachedFile = {
      id: crypto.randomUUID(),
      name: `AI_GEN_${Date.now()}.jpg`,
      type: 'image/jpeg',
      content: base64,
      isAiGenerated: true
    };
    onAddFile(newFile, activeItemId);

    const imgTag = `<img src="${newFile.id}" class="ai-embedded-img" style="max-width:100%; height:auto; border-radius:8px; margin: 10px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: block;" />`;
    const newContent = localContent.replace(originalTag, imgTag);

    setLocalContent(newContent);
    onSaveContent(newContent, activeItemId);

    if (editorRef.current) {
      editorRef.current.innerHTML = newContent;
    }
  };

  const handleGalleryImageUpload = (file: File) => {
    if (!activeItemId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      onAddFile(
        {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || 'image/png',
          content: dataUrl
        },
        activeItemId
      );
    };
    reader.readAsDataURL(file);
  };

  const execFormat = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const renderContent = () => {
    if (isLoading) return null;

    let processedHTML = localContent;

    if (files.length > 0) {
      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          const placeholder = `"${file.id}"`;
          const replacement = `"${file.content}"`;
          processedHTML = processedHTML.replaceAll(placeholder, replacement);
        }
      });
    }

    const parts = processedHTML.split(/(<ai-image-gen\s+prompt=(?:"[^"]*"|'[^']*')\s*(?:\/>|>\s*<\/ai-image-gen>))/gi);

    return parts.map((part, index) => {
      const match = part.match(/<ai-image-gen\s+prompt=(?:"([^"]*)"|'([^']*)')\s*(?:\/>|>\s*<\/ai-image-gen>)/i);
      if (match) {
        const prompt = match[1] ?? match[2] ?? '';
        return (
          <AIImagePlaceholder
            key={index}
            prompt={prompt}
            uiLang={uiLang}
            onConfirm={(base64) => handleConfirmImage(part, base64)}
            onNotify={onNotify}
          />
        );
      }
      return <div key={index} dangerouslySetInnerHTML={{ __html: part }} className="inline" />;
    });
  };

  const handleSendMessage = async (text: string) => {
    if (!activeItemId) return;
    const activeItem = nodes.find((n) => n.id === activeItemId) || edges.find((e) => e.id === activeItemId);
    if (!activeItem) return;

    const historySnapshot = chatByItem[activeItemId] || [];
    const newMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text, timestamp: Date.now() };
    setChatByItem((prev) => ({ ...prev, [activeItemId]: [...(prev[activeItemId] || []), newMessage] }));
    setIsChatLoading(true);

    try {
      const response = await chatWithAI(text, historySnapshot, activeItem, nodes, edges, uiLang);
      const reply: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', text: response, timestamp: Date.now() };
      setChatByItem((prev) => ({ ...prev, [activeItemId]: [...(prev[activeItemId] || []), reply] }));
    } catch (err: any) {
      onNotify(err?.message || 'Chat failed', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAppendReply = (replyText: string) => {
    if (!activeItemId) return;
    const escaped = replyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
    const block = `<div style="margin-top:12px;padding:10px 14px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;"><p>${escaped}</p></div>`;
    const updated = `${localContent || ''}${block}`;
    setLocalContent(updated);
    onSaveContent(updated, activeItemId);
    if (editorRef.current) {
      editorRef.current.innerHTML = updated;
    }
    onNotify(t.addedToContent, 'success');
  };

  const handleCreateNodeReply = (replyText: string) => {
    const firstLine = replyText.split('\n').find((l) => l.trim().length > 0) || 'AI Note';
    const title = firstLine.replace(/^[#*\-\s]+/, '').slice(0, 42).trim() || 'AI Note';
    onCreateNodeFromChat?.(title, replyText, activeItemId);
    onNotify(t.createdFromChat, 'success');
  };

  const handleSave = () => {
    if (editorRef.current) {
      let updatedHTML = editorRef.current.innerHTML;
      files.forEach((file) => {
        if (file.type.startsWith('image/') && file.content) {
          updatedHTML = updatedHTML.replaceAll(`"${file.content}"`, `"${file.id}"`);
        }
      });
      onSaveContent(updatedHTML, activeItemId || undefined);
      setLocalContent(updatedHTML);
      onNotify(uiLang === 'fa' ? 'تغییرات ذخیره شد.' : 'Changes saved.', 'success');
    }
    setIsEditing(false);
  };

  const handleToggleEdit = () => {
    if (!isEditing) {
      let editableContent = localContent;
      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          editableContent = editableContent.replaceAll(`"${file.id}"`, `"${file.content}"`);
        }
      });

      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = editableContent;
      }, 0);
    } else {
      setLocalContent(content);
    }
    setIsEditing(!isEditing);
  };

  const handleDragStart = (e: React.DragEvent, file: AttachedFile) => {
    const imgTag = `<img src="${file.content}" data-file-id="${file.id}" class="ai-embedded-img" style="max-width:100%; height:auto; border-radius:8px; margin: 10px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: block;" />`;
    e.dataTransfer.setData('text/html', imgTag);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleEditorDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleEditorDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const html = e.dataTransfer.getData('text/html');

    if (html) {
      let range = null;
      // @ts-ignore
      if (document.caretRangeFromPoint) {
        // @ts-ignore
        range = document.caretRangeFromPoint(e.clientX, e.clientY);
      } else if ((document as any).caretPositionFromPoint) {
        const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }

      if (range) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      document.execCommand('insertHTML', false, html);
    }
  };

  return (
    <div className="fixed inset-0 top-12 z-[100] bg-white flex flex-col shadow-2xl" dir={getDir(uiLang)}>
      {/* Header */}
      <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 md:px-6 shadow-md shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="text-blue-400 shrink-0" />
          <h1 className="text-lg md:text-xl font-bold truncate">{modeTitle || t.presentationTitle}</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <div className="flex items-center gap-1 bg-slate-800 rounded p-1 border border-slate-700">
                  <button onClick={() => execFormat('undo')} className="p-1.5 hover:bg-slate-700 rounded text-gray-300 hover:text-white" title={t.undo}>
                    <Undo2 size={16} />
                  </button>
                  <button onClick={() => execFormat('redo')} className="p-1.5 hover:bg-slate-700 rounded text-gray-300 hover:text-white" title={t.redo}>
                    <Redo2 size={16} />
                  </button>
                </div>

                <button onClick={handleSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors shadow-sm whitespace-nowrap">
                  <Save size={16} /> {t.saveChanges}
                </button>
                <button onClick={handleToggleEdit} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition-colors shadow-sm whitespace-nowrap">
                  <X size={16} /> {t.discard}
                </button>
              </>
            ) : (
              <>
                <button onClick={handleToggleEdit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors shadow-sm whitespace-nowrap">
                  <Edit size={16} /> {t.edit}
                </button>

                <div className="h-6 w-px bg-slate-700 mx-1" />

                <div className="flex items-center gap-1.5">
                  <select
                    className="bg-slate-800 text-xs md:text-sm outline-none cursor-pointer text-white border border-slate-700 rounded px-2 py-2"
                    value={targetLanguage}
                    disabled={isLoading}
                    onChange={(e) => onRegenerate(e.target.value as Language)}
                  >
                    <option value="fa">{t.persian}</option>
                    <option value="en">{t.english}</option>
                  </select>
                  <button
                    onClick={() => onRegenerate(targetLanguage)}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                    {t.generateAI}
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors" title={t.close}>
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative bg-gray-50">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-gray-100/50">
          <div className={`w-full max-w-5xl bg-white shadow-xl rounded-xl min-h-[600px] flex flex-col overflow-hidden transition-all ${isEditing ? 'max-w-[95%] ring-2 ring-blue-500' : ''}`}>
            {isEditing && (
              <div className="bg-blue-50 border-b border-blue-100 p-2.5 text-xs text-blue-800 flex flex-wrap items-center justify-between gap-2 px-4 md:px-6">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => execFormat('bold')} className="p-1.5 bg-white border border-blue-200 rounded hover:bg-blue-100" title="Bold">
                    <Bold size={14} />
                  </button>
                  <button onClick={() => execFormat('italic')} className="p-1.5 bg-white border border-blue-200 rounded hover:bg-blue-100" title="Italic">
                    <Italic size={14} />
                  </button>
                  <button onClick={() => execFormat('formatBlock', '<h2>')} className="px-2 py-1 bg-white border border-blue-200 rounded hover:bg-blue-100 font-bold text-xs" title="Heading">
                    H2
                  </button>
                  <button onClick={() => execFormat('insertUnorderedList')} className="p-1.5 bg-white border border-blue-200 rounded hover:bg-blue-100" title="List">
                    <List size={14} />
                  </button>
                  <button onClick={() => execFormat('formatBlock', '<blockquote>')} className="p-1.5 bg-white border border-blue-200 rounded hover:bg-blue-100" title="Quote">
                    <Quote size={14} />
                  </button>
                  <button onClick={() => execFormat('formatBlock', '<pre>')} className="p-1.5 bg-white border border-blue-200 rounded hover:bg-blue-100" title="Code">
                    <Code size={14} />
                  </button>
                </div>
                <span className="text-[11px] text-blue-700 font-medium">{t.editorHint}</span>
              </div>
            )}

            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 py-20 flex-1">
                <Loader2 size={48} className="animate-spin text-blue-500" />
                <p className="text-lg animate-pulse">{t.loadingAI}</p>
              </div>
            ) : isEditing ? (
              <div className="flex-1 flex flex-row h-full overflow-hidden">
                <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                  <div
                    ref={editorRef}
                    className="prose prose-lg max-w-none outline-none min-h-[500px] cursor-text [&_*]:box-border [&_*]:max-w-full"
                    contentEditable={true}
                    dir={targetLanguage === 'fa' ? 'rtl' : 'ltr'}
                    onDragOver={handleEditorDragOver}
                    onDrop={handleEditorDrop}
                  />
                </div>

                <div className="w-72 bg-gray-50 border-s border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-inner">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                      <ImagePlus size={16} /> {t.mediaGallery}
                    </h3>
                    <button
                      onClick={() => galleryUploadRef.current?.click()}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-md flex items-center gap-1"
                    >
                      <Upload size={12} /> {t.uploadImage}
                    </button>
                    <input
                      ref={galleryUploadRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleGalleryImageUpload(e.target.files[0]);
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {files.filter((f) => f.type.startsWith('image/')).length === 0 ? (
                    <div className="text-xs text-gray-400 italic text-center py-8 bg-gray-100 rounded border border-dashed px-3">
                      {t.noImages}
                      <br />
                      {t.noImagesHint}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{t.dragDropHint}</div>
                      {files
                        .filter((f) => f.type.startsWith('image/'))
                        .map((f) => (
                          <div
                            key={f.id}
                            className="group relative bg-white rounded-lg shadow-sm border hover:border-blue-500 transition-all p-2 cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={(e) => handleDragStart(e, f)}
                          >
                            <div className="aspect-video bg-gray-100 rounded overflow-hidden mb-2 relative">
                              <img src={f.content} alt={f.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <GripVertical className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-gray-600 truncate px-1 max-w-[150px]">{f.name}</div>
                              {activeItemId && (
                                <button
                                  onClick={() => onRemoveFile(f.id, activeItemId)}
                                  className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                  title={t.deleteImage}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 md:p-12 overflow-y-auto">
                <div
                  className="prose prose-lg max-w-none [&_*]:box-border [&_*]:max-w-full [&_img]:max-w-full [&_img]:h-auto [&_pre]:max-w-full [&_pre]:overflow-x-auto"
                  dir={targetLanguage === 'fa' ? 'rtl' : 'ltr'}
                >
                  {!localContent || localContent.trim() === '' ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      <Edit size={48} className="mb-4 text-gray-300" />
                      <p>{t.startWriting}</p>
                      <div className="flex gap-4 mt-4">
                        <button onClick={handleToggleEdit} className="text-blue-500 hover:underline font-bold">
                          {t.edit}
                        </button>
                        <span>{t.orLabel}</span>
                        <button onClick={() => onRegenerate(targetLanguage)} className="text-purple-500 hover:underline font-bold">
                          {t.generateAI}
                        </button>
                      </div>
                    </div>
                  ) : (
                    renderContent()
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <ChatWidget
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
          messages={messages}
          onSendMessage={handleSendMessage}
          onAppendToContent={handleAppendReply}
          onCreateNodeFromReply={onCreateNodeFromChat ? handleCreateNodeReply : undefined}
          isLoading={isChatLoading}
          lang={uiLang}
        />
      </div>
    </div>
  );
};