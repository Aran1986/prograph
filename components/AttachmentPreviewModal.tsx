import React, { useMemo } from 'react';
import { Download, FileText, Image as ImageIcon, X } from 'lucide-react';
import { AttachedFile, Language } from '../types';
import { translations, getDir } from '../utils/translations';

interface AttachmentPreviewModalProps {
  file: AttachedFile | null;
  onClose: () => void;
  lang: Language;
}

const decodeDataUrlText = (dataUrl: string): string | null => {
  try {
    if (!dataUrl.startsWith('data:')) return null;
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(0, commaIdx);
    const body = dataUrl.slice(commaIdx + 1);
    if (header.includes(';base64')) {
      const binary = atob(body);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
    return decodeURIComponent(body);
  } catch {
    return null;
  }
};

const TEXT_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.ts', '.tsx', '.js', '.jsx', '.py', '.html', '.css', '.xml', '.yaml', '.yml', '.log'];

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({ file, onClose, lang }) => {
  const isImage = Boolean(file?.type.startsWith('image/'));
  const isPdf = Boolean(file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')));
  const isTextLike = Boolean(
    file &&
      !isImage &&
      !isPdf &&
      (file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        file.type === 'application/xml' ||
        TEXT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)))
  );

  const decodedText = useMemo(() => {
    if (!file || !isTextLike) return null;
    return decodeDataUrlText(file.content);
  }, [file, isTextLike]);

  if (!file) return null;

  const t = translations[lang];
  const dir = getDir(lang);

  return (
    <div className="fixed inset-0 z-[155] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" dir={dir}>
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm md:text-base min-w-0">
            {isImage ? (
              <ImageIcon className="text-blue-400 shrink-0" size={18} />
            ) : (
              <FileText className="text-blue-400 shrink-0" size={18} />
            )}
            <span className="truncate">{file.name}</span>
          </div>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-slate-50 flex items-center justify-center">
          {isImage ? (
            <img
              src={file.content}
              alt={file.name}
              className="max-w-full max-h-[65vh] rounded-lg shadow border border-slate-200 object-contain bg-white"
            />
          ) : isPdf ? (
            <iframe
              src={file.content}
              title={file.name}
              className="w-full h-[62vh] rounded-lg border border-slate-200 bg-white"
            />
          ) : decodedText !== null ? (
            <pre
              dir="ltr"
              className="w-full max-h-[62vh] overflow-auto bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed"
            >
              {decodedText}
            </pre>
          ) : (
            <div className="text-center space-y-2 py-8 px-4">
              <FileText size={36} className="text-slate-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">{file.name}</div>
              <div className="text-xs text-slate-500">{file.type || 'application/octet-stream'}</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto pt-1">{t.cannotPreviewBinary}</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-white flex items-center justify-between gap-2 shrink-0">
          <span className="text-xs text-slate-500 truncate">{t.previewFile}</span>
          <div className="flex items-center gap-2">
            <a
              href={file.content}
              download={file.name}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} />
              <span>{t.downloadFile}</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
