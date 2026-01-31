import React, { useState, useEffect } from 'react';
import { Layers, Loader2, X, RefreshCw, Save, Edit, Bot, ImagePlus, Check, Trash2 } from 'lucide-react';
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
    <div className="my-6 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 p-3 relative group transition-all hover:border-blue-400 shadow-sm">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
          <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
          <span className="text-sm font-medium animate-pulse">Generating Scene...</span>
        </div>
      ) : image ? (
        <div className="relative">
          <img src={image} alt="AI Generated" className="w-full h-auto object-cover max-h-[500px] rounded shadow-md" />
          
          {/* Action Bar */}
          <div className="absolute bottom-4 right-4 flex gap-2">
             <button 
              onClick={() => onConfirm(image)}
              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2 px-4"
              title="Save & Insert to Document"
            >
              <Check size={18} />
              <span className="font-bold text-sm">Insert</span>
            </button>
            <button 
              onClick={generate}
              className="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-full shadow-lg transition-transform hover:scale-105"
              title="Regenerate"
            >
              <RefreshCw size={18} />
            </button>
            <button 
              onClick={() => setImage(null)}
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-105"
              title="Discard"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center gap-4 text-gray-500">
           <div className="text-sm italic bg-white px-3 py-1.5 rounded border shadow-sm max-w-[80%] text-center">Prompt: {prompt}</div>
           <button 
             onClick={generate}
             className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-6 py-2 rounded-full font-bold text-sm transition-colors shadow-sm"
           >
             <ImagePlus size={18} />
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

  const t = translations[uiLang];

  // Sync content when prop changes (e.g. after AI gen)
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

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
    // We replace the <ai-image-gen> tag with a standard <img> tag referencing the new file ID
    // Style ensures it stays within bounds
    const imgTag = `<img src="${newFile.id}" class="ai-embedded-img" style="max-width:100%; height:auto; border-radius:8px; margin: 10px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />`;
    const newContent = localContent.replace(originalTag, imgTag);
    
    setLocalContent(newContent);
    onSaveContent(newContent); // Persist immediately
  };

  // --- Content Parsing Logic (Only used when NOT editing) ---
  const renderContent = () => {
    if (isLoading) return null;

    let processedHTML = localContent;
    if (files.length > 0) {
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          // Replace raw IDs with Base64 content for display
          // We use a regex to ensure we only replace the src attribute if it matches the ID exacty
          // But simple replacement is usually sufficient for UUIDs
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
      onSaveContent(localContent);
      setIsEditing(false);
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
                    <button onClick={handleSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-bold transition-colors">
                        <Save size={16} /> {t.saveChanges}
                    </button>
                    <button onClick={() => { setIsEditing(false); setLocalContent(content); }} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded text-sm transition-colors">
                        <X size={16} /> {t.discard}
                    </button>
                 </>
             ) : (
                 <>
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm font-bold transition-colors">
                        <Edit size={16} /> {t.edit}
                    </button>
                    
                    <div className="h-6 w-px bg-slate-700 mx-2"></div>
                    
                    <div className="flex items-center gap-1">
                        <select 
                        className="bg-slate-800 text-sm outline-none cursor-pointer text-white border border-slate-700 rounded px-2 py-1"
                        value={targetLanguage}
                        disabled={isLoading}
                        onChange={(e) => onRegenerate(e.target.value as Language)} // Re-triggers with new language, might want separate logic
                        >
                            <option value="fa">{t.persian}</option>
                            <option value="en">{t.english}</option>
                        </select>
                        <button 
                            onClick={() => onRegenerate(targetLanguage)}
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded text-sm font-bold transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Bot size={16} />} 
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
            <div className={`w-full max-w-5xl bg-white shadow-xl rounded-xl min-h-[600px] flex flex-col overflow-hidden transition-all ${isEditing ? 'max-w-[95%]' : ''}`}>
            {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 py-20 flex-1">
                    <Loader2 size={48} className="animate-spin text-blue-500" />
                    <p className="text-lg animate-pulse">{t.loadingAI}</p>
                </div>
            ) : isEditing ? (
                <div className="flex-1 flex flex-row h-full">
                    {/* Editor Area */}
                    <div className="flex-1 p-4 flex flex-col">
                        <div className="text-xs text-gray-500 mb-2 font-mono bg-yellow-50 p-2 rounded border border-yellow-100">
                           💡 Hint: You can drag images from the right panel directly into the text below!
                        </div>
                        <textarea 
                            className="w-full h-full min-h-[500px] p-4 border border-gray-300 rounded focus:outline-blue-500 font-mono text-sm leading-relaxed resize-none shadow-inner"
                            value={localContent}
                            onChange={(e) => setLocalContent(e.target.value)}
                            placeholder="Type here..."
                            dir={targetLanguage === 'fa' ? 'rtl' : 'ltr'}
                        />
                    </div>
                    
                    {/* Draggable Images Sidebar */}
                    <div className="w-64 bg-gray-50 border-l border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto">
                        <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                           <ImagePlus size={16}/> Gallery
                        </h3>
                        <div className="text-xs text-gray-500 mb-2">Drag to insert:</div>
                        {files.filter(f => f.type.startsWith('image/')).length === 0 && (
                           <div className="text-xs text-gray-400 italic text-center py-4">No images found. Generate some AI images first or upload in properties.</div>
                        )}
                        {files.filter(f => f.type.startsWith('image/')).map(f => (
                           <div key={f.id} className="group relative">
                              <img 
                                src={f.content} 
                                alt={f.name}
                                className="w-full h-32 object-cover rounded border border-gray-300 cursor-grab hover:border-blue-500 hover:shadow-md transition-all active:cursor-grabbing bg-white"
                                draggable
                                onDragStart={(e) => {
                                   // Set the data to be the HTML tag for this image
                                   const tag = `<img src="${f.id}" class="ai-embedded-img" style="max-width:100%; height:auto; border-radius:8px; margin: 10px 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />`;
                                   e.dataTransfer.setData('text/plain', tag);
                                }}
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs pointer-events-none rounded">
                                 Drag me!
                              </div>
                           </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* Viewer Area */
                <div className="p-8 md:p-12">
                   <div 
                      className="prose prose-lg max-w-none [&_*]:box-border [&_*]:max-w-full [&_img]:max-w-full [&_img]:h-auto [&_pre]:max-w-full [&_pre]:overflow-x-auto" 
                      dir={targetLanguage === 'fa' ? 'rtl' : 'ltr'}
                   >
                    {(!localContent || localContent.trim() === "") ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <Edit size={48} className="mb-4 text-gray-300"/>
                            <p>{t.startWriting}</p>
                            <div className="flex gap-4 mt-4">
                                <button onClick={() => setIsEditing(true)} className="text-blue-500 hover:underline">{t.edit}</button>
                                <span>or</span>
                                <button onClick={() => onRegenerate(targetLanguage)} className="text-purple-500 hover:underline">{t.generateAI}</button>
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