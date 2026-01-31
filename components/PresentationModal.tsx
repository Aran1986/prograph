import React, { useState, useEffect, useRef } from 'react';
import { Layers, Loader2, X, RefreshCw, Save, Edit, Bot, ImagePlus, Check, Trash2, GripVertical } from 'lucide-react';
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
  onSaveContent: (newContent: string) => void;
  uiLang: Language;
  onAddFile: (file: AttachedFile, itemId: string) => void;
  onRemoveFile: (fileId: string, itemId: string) => void;
}

// Component to handle individual AI generated images
const AIImagePlaceholder: React.FC<{ 
  prompt: string; 
  onConfirm: (base64: string) => void;
}> = ({ prompt, onConfirm }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const result = await generateImage(prompt);
    if (result) {
      setImage(result);
    }
    setLoading(false);
  };

  return (
    <div className="my-6 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 p-4 relative group transition-all hover:border-blue-400 shadow-sm">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
          <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
          <span className="text-sm font-bold animate-pulse">Creating Visuals...</span>
        </div>
      ) : image ? (
        <div className="relative flex flex-col gap-3">
          <img src={image} alt="AI Generated" className="w-full h-auto object-cover max-h-[400px] rounded-lg shadow-md" />
          
          {/* Action Bar - Prominent Buttons */}
          <div className="flex items-center justify-center gap-4 mt-2 bg-white p-2 rounded-lg border shadow-sm">
             <button 
              onClick={() => onConfirm(image)}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg shadow transition-transform hover:scale-105 flex items-center gap-2"
              title="Save & Insert to Document"
            >
              <Check size={20} />
              <span className="font-bold">Insert Image</span>
            </button>
            <div className="w-px h-8 bg-gray-300 mx-2"></div>
            <button 
              onClick={generate}
              className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Try Again"
            >
              <RefreshCw size={18} />
              <span>Retry</span>
            </button>
            <button 
              onClick={() => setImage(null)}
              className="text-gray-700 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Discard"
            >
              <Trash2 size={18} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center gap-4 text-gray-500">
           <div className="text-sm italic bg-white px-4 py-2 rounded border shadow-sm max-w-[90%] text-center">Prompt: {prompt}</div>
           <button 
             onClick={generate}
             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full font-bold text-sm transition-colors shadow-md hover:shadow-lg"
           >
             <ImagePlus size={20} />
             Generate AI Image
           </button>
        </div>
      )}
    </div>
  );
};

export const PresentationModal: React.FC<PresentationModalProps> = ({ 
  isOpen, isLoading, content, files, targetLanguage, activeItemId, modeTitle, nodes, edges, onClose, onRegenerate, onSaveContent, uiLang, onAddFile, onRemoveFile 
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  
  // Ref for the WYSIWYG editor
  const editorRef = useRef<HTMLDivElement>(null);

  const t = translations[uiLang];

  // Sync content when prop changes
  useEffect(() => {
    setLocalContent(content);
    if (editorRef.current) {
        editorRef.current.innerHTML = content;
    }
  }, [content, isOpen]); // Sync on open as well

  if (!isOpen) return null;

  const handleConfirmImage = (originalTag: string, base64: string) => {
    if (!activeItemId) return;

    // 1. Create File
    const newFile = {
        id: crypto.randomUUID(),
        name: `AI_GEN_${Date.now()}.jpg`,
        type: 'image/jpeg',
        content: base64,
        isAiGenerated: true
    };
    onAddFile(newFile, activeItemId);

    // 2. Replace Tag in Content permanently
    const imgTag = `<img src="${newFile.id}" class="ai-embedded-img" style="max-width:100%; height:auto; border-radius:8px; margin: 10px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: block;" />`;
    const newContent = localContent.replace(originalTag, imgTag);
    
    setLocalContent(newContent);
    onSaveContent(newContent); // Persist immediately
    
    // Update editor view if in edit mode
    if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
    }
  };

  // --- Content Parsing Logic (For View Mode) ---
  const renderContent = () => {
    if (isLoading) return null;

    let processedHTML = localContent;
    
    // Pre-process images for display (replace ID with Base64)
    if (files.length > 0) {
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const placeholder = `"${file.id}"`; 
          const replacement = `"${file.content}"`;
          processedHTML = processedHTML.replaceAll(placeholder, replacement);
        }
      });
    }

    // Split content by the custom tag
    const parts = processedHTML.split(/(<ai-image-gen prompt=".*?"><\/ai-image-gen>)/g);
    
    return parts.map((part, index) => {
      const match = part.match(/<ai-image-gen prompt="(.*?)"><\/ai-image-gen>/);
      if (match) {
        const prompt = match[1];
        return (
          <AIImagePlaceholder 
            key={index} 
            prompt={prompt} 
            onConfirm={(base64) => handleConfirmImage(part, base64)}
          />
        );
      }
      return <div key={index} dangerouslySetInnerHTML={{ __html: part }} className="inline" />;
    });
  };

  const handleSendMessage = async (text: string) => {
    const activeItem = nodes.find(n => n.id === activeItemId) || edges.find(e => e.id === activeItemId);
    if (!activeItem) return;

    const newMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setIsChatLoading(true);

    const response = await chatWithAI(text, messages, activeItem, nodes, edges, uiLang);
    
    setIsChatLoading(false);
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: response, timestamp: Date.now() }]);
  };

  const handleSave = () => {
      if (editorRef.current) {
        const updatedHTML = editorRef.current.innerHTML;
        onSaveContent(updatedHTML);
        setLocalContent(updatedHTML);
      }
      setIsEditing(false);
  };

  const handleToggleEdit = () => {
      if (!isEditing) {
          // Entering edit mode: Prepare the content for WYSIWYG
          // We need to ensure image sources are viewable in the editor (base64)
          // But when saving, we might want to keep IDs. For simplicity in this app, 
          // we will inject base64 for viewing, and the save process keeps the HTML. 
          // NOTE: A robust system would swap IDs <-> URLs.
          // For now, let's inject Base64 so the user sees the images while editing.
          
          let editableContent = localContent;
          files.forEach(file => {
            if (file.type.startsWith('image/')) {
               editableContent = editableContent.replaceAll(`"${file.id}"`, `"${file.content}"`);
            }
          });
          
          // Wait for render then set HTML
          setTimeout(() => {
              if (editorRef.current) editorRef.current.innerHTML = editableContent;
          }, 0);
      } else {
          // Exiting without save (Discard)
          setLocalContent(content);
      }
      setIsEditing(!isEditing);
  };

  // Handle Drag Start from Gallery
  const handleDragStart = (e: React.DragEvent, file: AttachedFile) => {
      // Create an HTML img tag string
      const imgTag = `<img src="${file.content}" data-file-id="${file.id}" class="ai-embedded-img" style="max-width:100%; height:auto; border-radius:8px; margin: 10px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: block;" />`;
      e.dataTransfer.setData('text/html', imgTag);
      e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300" dir={getDir(uiLang)}>
      {/* Header */}
      <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="text-blue-400" />
          <h1 className="text-xl font-bold">{modeTitle || t.presentationTitle}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          
          {/* Edit / Save Toolbar */}
          <div className="flex items-center gap-2 mr-4">
             {isEditing ? (
                 <>
                    <button onClick={handleSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
                        <Save size={18} /> {t.saveChanges}
                    </button>
                    <button onClick={handleToggleEdit} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
                        <X size={18} /> {t.discard}
                    </button>
                 </>
             ) : (
                 <>
                    <button onClick={handleToggleEdit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
                        <Edit size={18} /> {t.edit}
                    </button>
                    
                    <div className="h-6 w-px bg-slate-700 mx-2"></div>
                    
                    <div className="flex items-center gap-1">
                        <select 
                        className="bg-slate-800 text-sm outline-none cursor-pointer text-white border border-slate-700 rounded px-2 py-2"
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
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Bot size={18} />} 
                            {t.generateAI}
                        </button>
                    </div>
                 </>
             )}
          </div>

          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors" title={t.close}>
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative bg-gray-50">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-gray-100/50">
            <div className={`w-full max-w-5xl bg-white shadow-xl rounded-xl min-h-[600px] flex flex-col overflow-hidden transition-all ${isEditing ? 'max-w-[95%] ring-2 ring-blue-500' : ''}`}>
            
            {/* Header for Editor Mode */}
            {isEditing && (
                <div className="bg-blue-50 border-b border-blue-100 p-3 text-xs text-blue-800 flex items-center justify-between px-6">
                    <span className="font-bold flex items-center gap-2"><Edit size={14}/> WYSIWYG Editor Mode</span>
                    <span>Start typing directly below or drag images from the right.</span>
                </div>
            )}

            {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 py-20 flex-1">
                    <Loader2 size={48} className="animate-spin text-blue-500" />
                    <p className="text-lg animate-pulse">{t.loadingAI}</p>
                </div>
            ) : isEditing ? (
                <div className="flex-1 flex flex-row h-full overflow-hidden">
                    {/* Visual Editor Area */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div 
                            ref={editorRef}
                            className="prose prose-lg max-w-none outline-none min-h-[500px] cursor-text [&_*]:box-border [&_*]:max-w-full"
                            contentEditable={true}
                            dir={targetLanguage === 'fa' ? 'rtl' : 'ltr'}
                            onInput={() => {
                                // Optional: Auto-save to ref logic could go here
                            }}
                        />
                    </div>
                    
                    {/* Draggable Images Sidebar */}
                    <div className="w-72 bg-gray-50 border-l border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-inner">
                        <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2 border-b pb-2">
                           <ImagePlus size={16}/> Media Gallery
                        </h3>
                        
                        {files.filter(f => f.type.startsWith('image/')).length === 0 ? (
                           <div className="text-xs text-gray-400 italic text-center py-8 bg-gray-100 rounded border border-dashed">
                               No images available.<br/>Generate AI images or upload files to see them here.
                           </div>
                        ) : (
                           <div className="space-y-3">
                               <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Drag & Drop</div>
                               {files.filter(f => f.type.startsWith('image/')).map(f => (
                                   <div key={f.id} className="group relative bg-white rounded-lg shadow-sm border hover:border-blue-500 transition-all p-2 cursor-grab active:cursor-grabbing" draggable onDragStart={(e) => handleDragStart(e, f)}>
                                      <div className="aspect-video bg-gray-100 rounded overflow-hidden mb-2 relative">
                                          <img 
                                            src={f.content} 
                                            alt={f.name}
                                            className="w-full h-full object-cover"
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                              <GripVertical className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                          </div>
                                      </div>
                                      <div className="text-xs text-gray-600 truncate px-1">{f.name}</div>
                                   </div>
                               ))}
                           </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Viewer Area */
                <div className="p-8 md:p-12 overflow-y-auto">
                   <div 
                      className="prose prose-lg max-w-none [&_*]:box-border [&_*]:max-w-full [&_img]:max-w-full [&_img]:h-auto [&_pre]:max-w-full [&_pre]:overflow-x-auto" 
                      dir={targetLanguage === 'fa' ? 'rtl' : 'ltr'}
                   >
                    {(!localContent || localContent.trim() === "") ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <Edit size={48} className="mb-4 text-gray-300"/>
                            <p>{t.startWriting}</p>
                            <div className="flex gap-4 mt-4">
                                <button onClick={handleToggleEdit} className="text-blue-500 hover:underline font-bold">{t.edit}</button>
                                <span>or</span>
                                <button onClick={() => onRegenerate(targetLanguage)} className="text-purple-500 hover:underline font-bold">{t.generateAI}</button>
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

        {/* Floating Chat Widget */}
        <ChatWidget 
          isOpen={isChatOpen} 
          onToggle={() => setIsChatOpen(!isChatOpen)}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isChatLoading}
          lang={uiLang}
        />
      </div>
    </div>
  );
};