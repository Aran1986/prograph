import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Send, FilePlus, PlusCircle } from 'lucide-react';
import { ChatMessage, Language } from '../types';
import { translations, getDir } from '../utils/translations';

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onAppendToContent?: (text: string) => void;
  onCreateNodeFromReply?: (text: string) => void;
  isLoading: boolean;
  lang: Language;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  isOpen,
  onToggle,
  messages,
  onSendMessage,
  onAppendToContent,
  onCreateNodeFromReply,
  isLoading,
  lang
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className={`fixed bottom-0 right-8 z-[110] bg-white shadow-2xl rounded-t-xl border border-gray-200 transition-all duration-300 flex flex-col ${isOpen ? 'h-96 w-80 sm:w-96' : 'h-12 w-64'}`}
      dir={getDir(lang)}
    >
      {/* Header */}
      <div
        className="bg-blue-600 text-white p-3 rounded-t-xl cursor-pointer flex justify-between items-center hover:bg-blue-700 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <MessageSquare size={16} />
          {t.chatAssistant}
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </div>

      {/* Body */}
      {isOpen && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 flex flex-col">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded-lg text-xs max-w-[88%] ${
                  msg.role === 'user'
                    ? 'bg-blue-100 text-blue-900 self-start'
                    : 'bg-white border border-slate-200 text-gray-800 self-end shadow-xs'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                {msg.role === 'assistant' && (onAppendToContent || onCreateNodeFromReply) && (
                  <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-100 flex-wrap">
                    {onAppendToContent && (
                      <button
                        type="button"
                        onClick={() => onAppendToContent(msg.text)}
                        className="text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                      >
                        <FilePlus size={11} /> {t.appendToContent}
                      </button>
                    )}
                    {onCreateNodeFromReply && (
                      <button
                        type="button"
                        onClick={() => onCreateNodeFromReply(msg.text)}
                        className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                      >
                        <PlusCircle size={11} /> {t.createChildNode}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="text-xs text-gray-400 italic text-center p-2">{t.aiThinking}</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-2 border-t bg-white flex gap-2">
            <input
              type="text"
              className="flex-1 border rounded px-2 py-1 text-sm focus:outline-blue-500"
              placeholder={t.askQuestion}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  onSendMessage(input);
                  setInput('');
                }
              }}
            />
            <button
              disabled={isLoading || !input.trim()}
              onClick={() => {
                onSendMessage(input);
                setInput('');
              }}
              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};