import React, { useEffect } from 'react';
import {
  Copy,
  Crosshair,
  Edit2,
  GitBranchPlus,
  Link as LinkIcon,
  ArrowLeftRight,
  Maximize2,
  Plus,
  Trash2,
  Sun,
  Moon,
  Maximize,
  Minimize2,
  Lock,
  Unlock,
  Paintbrush,
  ClipboardPaste
} from 'lucide-react';
import { Language } from '../types';
import { translations, getDir } from '../utils/translations';

export interface CanvasContextMenuState {
  x: number;
  y: number;
  type: 'node' | 'edge' | 'canvas';
  itemId?: string;
  worldPos?: [number, number, number];
}

interface CanvasContextMenuProps {
  menu: CanvasContextMenuState | null;
  lang: Language;
  sceneTheme: 'light' | 'dark';
  isZenMode: boolean;
  onClose: () => void;
  onOpenDetails: (id: string) => void;
  onFocusItem: (id: string, type: 'node' | 'edge') => void;
  onAddChildNode: (parentId: string) => void;
  onStartConnectFromNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onFlipEdgeDirection: (edgeId: string) => void;
  onDeleteItem: (id: string, type: 'node' | 'edge') => void;
  onAddNodeAt: (pos?: [number, number, number]) => void;
  onFitView: () => void;
  onToggleTheme: () => void;
  onToggleZenMode: () => void;
  isTargetLocked?: boolean;
  onToggleLockNode: (nodeId: string) => void;
  canPasteStyle?: boolean;
  onCopyStyle: (id: string, type: 'node' | 'edge') => void;
  onPasteStyle: (id: string, type: 'node' | 'edge') => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  menu,
  lang,
  sceneTheme,
  isZenMode,
  onClose,
  onOpenDetails,
  onFocusItem,
  onAddChildNode,
  onStartConnectFromNode,
  onDuplicateNode,
  onFlipEdgeDirection,
  onDeleteItem,
  onAddNodeAt,
  onFitView,
  onToggleTheme,
  onToggleZenMode,
  isTargetLocked = false,
  onToggleLockNode,
  canPasteStyle = false,
  onCopyStyle,
  onPasteStyle
}) => {
  useEffect(() => {
    if (!menu) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handlePointerDown = () => onClose();
    window.addEventListener('keydown', handleKey);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const t = translations[lang];
  const dir = getDir(lang);

  const menuWidth = 208;
  const menuHeight = menu.type === 'node' ? 360 : menu.type === 'edge' ? 228 : 168;
  const left = typeof window !== 'undefined' ? Math.max(8, Math.min(menu.x, window.innerWidth - menuWidth - 8)) : menu.x;
  const top = typeof window !== 'undefined' ? Math.max(56, Math.min(menu.y, window.innerHeight - menuHeight - 8)) : menu.y;

  const itemBtnClass =
    'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-start';

  return (
    <div
      dir={dir}
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[135] w-52 bg-white/95 border border-slate-200 rounded-xl shadow-2xl py-1.5 overflow-hidden select-none"
    >
      {menu.type === 'node' && menu.itemId && (
        <>
          <button
            className={itemBtnClass}
            onClick={() => {
              onOpenDetails(menu.itemId!);
              onClose();
            }}
          >
            <Edit2 size={14} className="text-blue-600 shrink-0" />
            <span>{t.ctxOpenDetails}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onFocusItem(menu.itemId!, 'node');
              onClose();
            }}
          >
            <Crosshair size={14} className="text-indigo-600 shrink-0" />
            <span>{t.ctxFocus}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onAddChildNode(menu.itemId!);
              onClose();
            }}
          >
            <GitBranchPlus size={14} className="text-emerald-600 shrink-0" />
            <span>{t.ctxAddChild}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onStartConnectFromNode(menu.itemId!);
              onClose();
            }}
          >
            <LinkIcon size={14} className="text-orange-600 shrink-0" />
            <span>{t.ctxConnectFrom}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onDuplicateNode(menu.itemId!);
              onClose();
            }}
          >
            <Copy size={14} className="text-slate-600 shrink-0" />
            <span>{t.ctxDuplicate}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onToggleLockNode(menu.itemId!);
              onClose();
            }}
          >
            {isTargetLocked ? (
              <Unlock size={14} className="text-amber-600 shrink-0" />
            ) : (
              <Lock size={14} className="text-amber-600 shrink-0" />
            )}
            <span>{isTargetLocked ? t.unlockNode : t.lockNode}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onCopyStyle(menu.itemId!, 'node');
              onClose();
            }}
          >
            <Paintbrush size={14} className="text-purple-600 shrink-0" />
            <span>{t.copyStyle}</span>
          </button>
          {canPasteStyle && (
            <button
              className={itemBtnClass}
              onClick={() => {
                onPasteStyle(menu.itemId!, 'node');
                onClose();
              }}
            >
              <ClipboardPaste size={14} className="text-purple-600 shrink-0" />
              <span>{t.pasteStyle}</span>
            </button>
          )}
          <div className="my-1 border-t border-slate-100" />
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-start"
            onClick={() => {
              onDeleteItem(menu.itemId!, 'node');
              onClose();
            }}
          >
            <Trash2 size={14} className="shrink-0" />
            <span>{t.ctxDelete}</span>
          </button>
        </>
      )}

      {menu.type === 'edge' && menu.itemId && (
        <>
          <button
            className={itemBtnClass}
            onClick={() => {
              onOpenDetails(menu.itemId!);
              onClose();
            }}
          >
            <Edit2 size={14} className="text-blue-600 shrink-0" />
            <span>{t.ctxOpenDetails}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onFocusItem(menu.itemId!, 'edge');
              onClose();
            }}
          >
            <Crosshair size={14} className="text-indigo-600 shrink-0" />
            <span>{t.ctxFocus}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onFlipEdgeDirection(menu.itemId!);
              onClose();
            }}
          >
            <ArrowLeftRight size={14} className="text-orange-600 shrink-0" />
            <span>{t.ctxFlipDirection}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onCopyStyle(menu.itemId!, 'edge');
              onClose();
            }}
          >
            <Paintbrush size={14} className="text-purple-600 shrink-0" />
            <span>{t.copyStyle}</span>
          </button>
          {canPasteStyle && (
            <button
              className={itemBtnClass}
              onClick={() => {
                onPasteStyle(menu.itemId!, 'edge');
                onClose();
              }}
            >
              <ClipboardPaste size={14} className="text-purple-600 shrink-0" />
              <span>{t.pasteStyle}</span>
            </button>
          )}
          <div className="my-1 border-t border-slate-100" />
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-start"
            onClick={() => {
              onDeleteItem(menu.itemId!, 'edge');
              onClose();
            }}
          >
            <Trash2 size={14} className="shrink-0" />
            <span>{t.ctxDelete}</span>
          </button>
        </>
      )}

      {menu.type === 'canvas' && (
        <>
          <button
            className={itemBtnClass}
            onClick={() => {
              onAddNodeAt(menu.worldPos);
              onClose();
            }}
          >
            <Plus size={14} className="text-blue-600 shrink-0" />
            <span>{t.ctxAddNodeHere}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onFitView();
              onClose();
            }}
          >
            <Maximize2 size={14} className="text-indigo-600 shrink-0" />
            <span>{t.ctxFitView}</span>
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            className={itemBtnClass}
            onClick={() => {
              onToggleTheme();
              onClose();
            }}
          >
            {sceneTheme === 'dark' ? (
              <Sun size={14} className="text-amber-500 shrink-0" />
            ) : (
              <Moon size={14} className="text-slate-600 shrink-0" />
            )}
            <span>{sceneTheme === 'dark' ? t.themeLight : t.themeDark}</span>
          </button>
          <button
            className={itemBtnClass}
            onClick={() => {
              onToggleZenMode();
              onClose();
            }}
          >
            {isZenMode ? (
              <Minimize2 size={14} className="text-emerald-600 shrink-0" />
            ) : (
              <Maximize size={14} className="text-emerald-600 shrink-0" />
            )}
            <span>{isZenMode ? t.exitZenMode : t.zenMode}</span>
          </button>
        </>
      )}
    </div>
  );
};
