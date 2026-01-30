import React, { useState, useEffect } from 'react';
import { Layers, Loader2, X, RefreshCw, Save } from 'lucide-react';
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
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  onClose: () => void;
  onRegenerate: (lang: Language) => void;
  uiLang: Language;
  onAddFile: (file: AttachedFile, itemId: string) => void;
  onRemoveFile: (fileId: string, itemId: string) => void;
}

// Component to handle individual AI generated images
const AIImagePlaceholder: React.FC<{ 
  prompt: string; 
  onSave: (base64: string) => void; 
}> = ({ prompt, onSave }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const generate = async () => {
    setLoading(true);
    const result = await generateImage(prompt);
    if (result) {
      setImage(result);
      onSave(result); // Trigger save to Node
    }
    setLoading(false);
  };

  useEffect(() => {
    generate();
  }, []); // Generate on mount

  return (
    <div className="my-4 border rounded-lg overflow-hidden bg-gray-50 shadow-sm relative group">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
          <Loader2 className="animate-spin" />
          <span className="text-xs">Generating AI Scene...</span>
        </div>
      ) : image ? (
        <>
          <img src={image} alt="AI Generated" className="w-full h-auto object-cover max-h-[500px]" />
          <button 
            onClick={generate}
            className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-700 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            title="Regenerate (Refresh)"
          >
            <RefreshCw size={16} />
          </button>
        </>
      ) : (
        <div className="h-32 flex items-center justify-center text-red-400">Failed to generate image</div>
      )}
      <div className="bg-gray-100 p-2 text-xs text-gray-500 italic border-t">
        Prompt: {prompt}
      </div>
    </div>
  );
};

export const PresentationModal: React.FC<PresentationModalProps> = ({ 
  isOpen, isLoading, content, files, targetLanguage, activeItemId, nodes, edges, onClose, onRegenerate, uiLang, onAddFile, onRemoveFile 
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // State to track generated images within this session to prevent re-generation on re-renders
  // Note: Actual saving is handled by onAddFile callback to App.tsx
  const [generatedCache, setGeneratedCache] = useState<Record<string, string>>({});

  const t = translations[uiLang];

  if (!isOpen) return null;

  // --- Content Parsing Logic ---
  // We need to transform the raw HTML string into React Nodes to inject the AIImagePlaceholder component interactively.
  
  // 1. First, basic replacement of uploaded images
  let processedHTML = content;
  if (!isLoading && files.length > 0) {
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const placeholder = `"${file.id}"`;
        const replacement = `"${file.content}"`;
        processedHTML = processedHTML.replaceAll(placeholder, replacement);
      }
    });
  }

  // 2. Parse for <ai-image-gen> tags
  const renderContent = () => {
    if (isLoading) return null;

    // Split content by the custom tag
    const parts = processedHTML.split(/(<ai-image-gen prompt=".*?"><\/ai-image-gen>)/g);
    
    return parts.map((part, index) => {
      const match = part.match(/<ai-image-gen prompt="(.*?)"><\/ai-image-gen>/);
      if (match) {
        const prompt = match[1];
        // Check if we already have a file attached that matches this "AI Generated" pattern?
        // For simplicity, we just render the generator which handles self-saving.
        return (
          <AIImagePlaceholder 
            key={index} 
            prompt={prompt} 
            onSave={(base64) => {
               if (activeItemId) {
                 // Create a file object
                 const newFile = {
                   id: crypto.randomUUID(),
                   name: `AI_GEN_${Date.now()}.jpg`,
                   type: 'image/jpeg',
                   content: base64
                 };
                 // Add to app state (files array)
                 onAddFile(newFile, activeItemId);
               }
            }}
          />
        );
      }
      // Render standard HTML parts
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

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300" dir={getDir(uiLang)}>
      {/* Header */}
      <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center gap-2">
          <Layers className="text-blue-400" />
          <h1 className="text-xl font-bold">{t.presentationTitle}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1">
             <span className="text-xs text-gray-400">{t.presLang}:</span>
             <select 
               className="bg-transparent text-sm outline-none cursor-pointer text-white"
               value={targetLanguage}
               disabled={isLoading}
               onChange={(e) => onRegenerate(e.target.value as Language)}
             >
               <option value="fa" className="text-slate-900">{t.persian}</option>
               <option value="en" className="text-slate-900">{t.english}</option>
             </select>
             {isLoading && <Loader2 size={14} className="animate-spin" />}
          </div>

          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors" title={t.close}>
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-gray-50 flex justify-center relative">
        <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl min-h-[500px] p-8 pb-32">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 py-20">
              <Loader2 size={48} className="animate-spin text-blue-500" />
              <p className="text-lg animate-pulse">{t.loadingAI}</p>
            </div>
          ) : (
             <div className="prose prose-lg max-w-none" dir={targetLanguage === 'fa' ? 'rtl' : 'ltr'}>
                {renderContent()}
             </div>
          )}
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