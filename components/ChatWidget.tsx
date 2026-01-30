import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { ChatMessage, Language } from '../types';
import { translations, getDir } from '../utils/translations';

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  lang: Language;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  isOpen, onToggle, messages, onSendMessage, isLoading, lang 
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div 
      className={`fixed bottom-0 right-8 z-[110] bg-white shadow-2xl rounded-t-xl border border-gray-200 transition-all duration-300 flex flex-col ${isOpen ? 'h-96 w-80' : 'h-12 w-64'}`}
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
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`p-2 rounded-lg text-xs max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-blue-100 text-blue-900' // RTL styling handled by container logic below
                    : 'bg-white border text-gray-800'
                }`}
                style={{ 
                   alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end',
                   // In RTL, "mr-auto" pushes to left (end), "ml-auto" pushes to right (start)
                   marginLeft: msg.role === 'user' ? (lang === 'fa' ? 'auto' : '0') : (lang === 'fa' ? '0' : 'auto'),
                   marginRight: msg.role === 'user' ? (lang === 'fa' ? '0' : 'auto') : (lang === 'fa' ? 'auto' : '0'),
                }}
              >
                {msg.text}
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
                  setInput("");
                }
              }}
            />
            <button 
              disabled={isLoading || !input.trim()}
              onClick={() => {
                onSendMessage(input);
                setInput("");
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