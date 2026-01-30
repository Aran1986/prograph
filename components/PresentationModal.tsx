import React, { useState } from 'react';
import { Layers, Loader2, X } from 'lucide-react';
import { AttachedFile, Language, ChatMessage, GraphNodeData, GraphEdgeData } from '../types';
import { translations, getDir } from '../utils/translations';
import { ChatWidget } from './ChatWidget';
import { chatWithAI } from '../services/ai';

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
}

export const PresentationModal: React.FC<PresentationModalProps> = ({ 
  isOpen, isLoading, content, files, targetLanguage, activeItemId, nodes, edges, onClose, onRegenerate, uiLang 
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const t = translations[uiLang];

  if (!isOpen) return null;

  // Process Content (Image Injection)
  let processedContent = content;
  if (!isLoading && files.length > 0) {
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const placeholder = `"${file.id}"`;
        const replacement = `"${file.content}"`;
        processedContent = processedContent.replaceAll(placeholder, replacement);
      }
    });
  }

  const handleSendMessage = async (text: string) => {
    const activeItem = nodes.find(n => n.id === activeItemId) || edges.find(e => e.id === activeItemId);
    if (!activeItem) return;

    const newMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setIsChatLoading(true);

    // Call AI Service
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
             <div 
               className="prose prose-lg max-w-none"
               dir={targetLanguage === 'fa' ? 'rtl' : 'ltr'}
               dangerouslySetInnerHTML={{ __html: processedContent }}
             />
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