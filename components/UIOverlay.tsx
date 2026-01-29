import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Link as LinkIcon, Download, Upload, 
  Trash2, Save, MapPin, ChevronUp, ChevronDown, 
  Settings, Camera, FileJson, MousePointer2,
  Menu, HelpCircle, Eye, Check, X
} from 'lucide-react';
import { AppState, GraphNodeData, GraphEdgeData, UIPanelsState } from '../types';

interface UIOverlayProps {
  appState: AppState;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  cameraPos: { x: number; y: number; z: number };
  uiPanels: UIPanelsState;
  setUiPanels: React.Dispatch<React.SetStateAction<UIPanelsState>>;
  onAddNode: () => void;
  onToggleEdgeMode: () => void;
  onUpdateItem: (id: string, type: 'node' | 'edge', data: Partial<GraphNodeData | GraphEdgeData>) => void;
  onDeleteItem: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onCameraTeleport: (x: number, y: number, z: number) => void;
  hoverInfo: { label: string; summary: string; full: string } | null;
}

const Panel: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ 
  title, icon, children, defaultOpen = true 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg mb-4 overflow-hidden w-64 transition-all duration-200">
      <div 
        className="bg-gray-100 p-2 flex items-center justify-between cursor-pointer hover:bg-gray-200 select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {isOpen && <div className="p-3 text-sm">{children}</div>}
    </div>
  );
};

const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
      <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <HelpCircle size={20} /> راهنمای استفاده
        </h2>
        <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded"><X size={20}/></button>
      </div>
      <div className="p-6 space-y-4 text-gray-700 text-sm">
        <div className="space-y-2">
          <h3 className="font-bold border-b pb-1 text-slate-800">کنترل‌های موس</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="font-semibold">کلیک چپ:</span> انتخاب نود یا یال / جابجایی نود (درگ)</li>
            <li><span className="font-semibold">کلیک راست (نگه داشتن):</span> چرخش دوربین</li>
            <li><span className="font-semibold">اسکرول:</span> زوم به جلو و عقب</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="font-bold border-b pb-1 text-slate-800">نوار ابزار (Tools)</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="font-semibold">نود جدید:</span> ایجاد یک گره تصادفی در محیط.</li>
            <li><span className="font-semibold">ایجاد اتصال:</span> روی دگمه کلیک کنید، سپس نود مبدا و بعد نود مقصد را انتخاب کنید.</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="font-bold border-b pb-1 text-slate-800">مدیریت فایل</h3>
          <p>از منوی "فایل" در نوار بالا می‌توانید پروژه خود را ذخیره (دانلود JSON) یا لود کنید.</p>
        </div>
      </div>
      <div className="bg-gray-100 p-4 flex justify-end">
        <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">متوجه شدم</button>
      </div>
    </div>
  </div>
);

export const UIOverlay: React.FC<UIOverlayProps> = ({
  appState, nodes, edges, cameraPos, uiPanels, setUiPanels,
  onAddNode, onToggleEdgeMode, onUpdateItem, onDeleteItem,
  onExport, onImport, onCameraTeleport, hoverInfo
}) => {
  const [camInput, setCamInput] = useState({ x: 0, y: 10, z: 20 });
  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const togglePanel = (key: keyof UIPanelsState) => {
    setUiPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // Find active item
  const activeNode = appState.activeType === 'node' ? nodes.find(n => n.id === appState.activeId) : null;
  const activeEdge = appState.activeType === 'edge' ? edges.find(e => e.id === appState.activeId) : null;

  return (
    <>
      {/* --- Top Navigation Bar --- */}
      <div 
        className="fixed top-0 left-0 right-0 h-12 bg-slate-800 text-white shadow-md z-40 flex items-center px-4 justify-between select-none"
        onClick={(e) => e.stopPropagation()} // Prevent closing menus when clicking the bar itself
      >
        <div className="flex items-center gap-6 h-full">
          <div className="font-bold text-lg tracking-wider flex items-center gap-2">
            <span className="text-blue-400">Graph</span>Pro
          </div>

          {/* Menus */}
          <div className="flex items-center h-full gap-1">
            
            {/* File Menu */}
            <div className="relative h-full flex items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}
                className={`px-3 py-1 rounded hover:bg-slate-700 transition-colors ${activeMenu === 'file' ? 'bg-slate-700' : ''}`}
              >
                فایل (File)
              </button>
              {activeMenu === 'file' && (
                <div className="absolute top-10 right-0 w-48 bg-white text-slate-800 rounded shadow-xl border border-gray-200 overflow-hidden flex flex-col z-50">
                   <button 
                    className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 text-right w-full transition-colors border-b border-gray-100"
                    onClick={onExport}
                   >
                     <Save size={16} className="text-blue-600" /> ذخیره پروژه (JSON)
                   </button>
                   <button 
                    className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 text-right w-full transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                   >
                     <Upload size={16} className="text-amber-600" /> لود کردن پروژه
                   </button>
                   <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) onImport(e.target.files[0]);
                      setActiveMenu(null);
                    }} 
                   />
                </div>
              )}
            </div>

            {/* View Menu */}
            <div className="relative h-full flex items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'view' ? null : 'view'); }}
                className={`px-3 py-1 rounded hover:bg-slate-700 transition-colors ${activeMenu === 'view' ? 'bg-slate-700' : ''}`}
              >
                نمایش (View)
              </button>
              {activeMenu === 'view' && (
                <div className="absolute top-10 right-0 w-56 bg-white text-slate-800 rounded shadow-xl border border-gray-200 overflow-hidden flex flex-col z-50 p-2">
                   <div className="text-xs font-bold text-gray-400 mb-2 px-2">پنل‌های کناری</div>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input type="checkbox" checked={uiPanels.tools} onChange={() => togglePanel('tools')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>پنل ابزارها (Tools)</span>
                   </label>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input type="checkbox" checked={uiPanels.properties} onChange={() => togglePanel('properties')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>پنل تنظیمات (Properties)</span>
                   </label>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input type="checkbox" checked={uiPanels.camera} onChange={() => togglePanel('camera')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>کنترل دوربین (Camera)</span>
                   </label>
                   <div className="h-px bg-gray-200 my-1"></div>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input type="checkbox" checked={uiPanels.hints} onChange={() => togglePanel('hints')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>راهنمای پایین صفحه</span>
                   </label>
                </div>
              )}
            </div>

            {/* Help Button */}
             <button 
                onClick={() => setShowHelp(true)}
                className="px-3 py-1 rounded hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                راهنما
              </button>
          </div>
        </div>
      </div>

      {/* --- Help Modal --- */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* --- Tooltip Modal --- */}
      {hoverInfo && (
        <div 
          className="fixed z-30 pointer-events-none bg-gray-900/95 backdrop-blur text-white p-4 rounded-lg shadow-2xl border border-gray-600 max-w-sm transition-opacity"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <div className="font-bold text-xl mb-2 text-blue-300">{hoverInfo.label}</div>
          <div className="text-gray-300 text-sm mb-3 border-b border-gray-700 pb-2 leading-relaxed">{hoverInfo.summary}</div>
          <div className="text-gray-400 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{hoverInfo.full}</div>
        </div>
      )}

      {/* --- Right Sidebar (Tools) --- */}
      {uiPanels.tools && (
        <div className="absolute top-16 right-4 z-10 flex flex-col max-h-[90vh] overflow-y-auto pr-1">
          <Panel title="ابزارها" icon={<Settings size={16} />}>
            <div className="flex flex-col gap-2">
              <button 
                onClick={onAddNode}
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded transition-colors"
              >
                <Plus size={16} />
                <span>نود جدید</span>
              </button>
              <button 
                onClick={onToggleEdgeMode}
                className={`flex items-center justify-center gap-2 p-2 rounded transition-colors text-white ${
                  appState.mode !== 'select' ? 'bg-green-600 ring-2 ring-green-300' : 'bg-gray-500 hover:bg-gray-600'
                }`}
              >
                <LinkIcon size={16} />
                <span>{appState.mode === 'select' ? 'ایجاد یال (اتصال)' : 'لغو حالت اتصال'}</span>
              </button>
              {appState.mode !== 'select' && (
                <div className="text-xs text-center text-orange-600 font-bold bg-orange-100 p-1 rounded border border-orange-200">
                  {appState.mode === 'edge-start' ? 'نود مبدا را انتخاب کنید' : 'نود مقصد را انتخاب کنید'}
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* --- Left Sidebar (Properties & Camera) --- */}
      <div className="absolute top-16 left-4 z-10 flex flex-col max-h-[90vh] overflow-y-auto pl-1 gap-0">
        
        {uiPanels.properties && (
          <Panel title="تنظیمات آیتم" icon={<MousePointer2 size={16} />}>
            {activeNode && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">نام / لیبل</label>
                  <input 
                    type="text" 
                    className="w-full border rounded p-1 text-sm bg-gray-50 focus:bg-white transition-colors" 
                    value={activeNode.label}
                    onChange={(e) => onUpdateItem(activeNode.id, 'node', { label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">اندازه</label>
                  <input 
                    type="range" min="0.5" max="3" step="0.1" 
                    className="w-full"
                    value={activeNode.size}
                    onChange={(e) => onUpdateItem(activeNode.id, 'node', { size: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">رنگ</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      className="w-8 h-8 cursor-pointer rounded border border-gray-300 p-0 overflow-hidden"
                      value={activeNode.color}
                      onChange={(e) => onUpdateItem(activeNode.id, 'node', { color: e.target.value })}
                    />
                    <div className="text-xs text-gray-400 flex items-center">{activeNode.color}</div>
                  </div>
                </div>
                <hr className="border-gray-200" />
                <div>
                  <label className="text-xs text-gray-500 block mb-1">خلاصه (Summary)</label>
                  <textarea 
                    className="w-full border rounded p-1 text-sm h-16 bg-gray-50 focus:bg-white transition-colors"
                    value={activeNode.summary}
                    onChange={(e) => onUpdateItem(activeNode.id, 'node', { summary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">محتوای کامل (RAG)</label>
                  <textarea 
                    className="w-full border rounded p-1 text-sm h-24 bg-gray-50 focus:bg-white transition-colors"
                    value={activeNode.fullContent}
                    onChange={(e) => onUpdateItem(activeNode.id, 'node', { fullContent: e.target.value })}
                  />
                </div>
                <button onClick={onDeleteItem} className="mt-2 bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                  <Trash2 size={16} /> <span>حذف نود</span>
                </button>
              </div>
            )}

            {activeEdge && (
              <div className="flex flex-col gap-3">
                 <div>
                  <label className="text-xs text-gray-500 block mb-1">برچسب یال</label>
                  <input 
                    type="text" 
                    className="w-full border rounded p-1 text-sm bg-gray-50 focus:bg-white" 
                    value={activeEdge.label}
                    onChange={(e) => onUpdateItem(activeEdge.id, 'edge', { label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">رنگ یال</label>
                  <input 
                    type="color" 
                    className="w-full h-8 cursor-pointer rounded border border-gray-300"
                    value={activeEdge.color}
                    onChange={(e) => onUpdateItem(activeEdge.id, 'edge', { color: e.target.value })}
                  />
                </div>
                <button onClick={onDeleteItem} className="mt-2 bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                  <Trash2 size={16} /> <span>حذف یال</span>
                </button>
              </div>
            )}

            {!activeNode && !activeEdge && (
              <div className="text-center text-gray-400 py-4 text-xs italic">
                یک نود یا یال را برای ویرایش انتخاب کنید
              </div>
            )}
          </Panel>
        )}

        {uiPanels.camera && (
          <Panel title="موقعیت دوربین" icon={<Camera size={16} />}>
             <div className="flex gap-1 mb-2">
                <input type="number" placeholder="X" className="w-1/3 border rounded p-1 text-xs text-center" value={camInput.x} onChange={e => setCamInput({...camInput, x: parseFloat(e.target.value)})} />
                <input type="number" placeholder="Y" className="w-1/3 border rounded p-1 text-xs text-center" value={camInput.y} onChange={e => setCamInput({...camInput, y: parseFloat(e.target.value)})} />
                <input type="number" placeholder="Z" className="w-1/3 border rounded p-1 text-xs text-center" value={camInput.z} onChange={e => setCamInput({...camInput, z: parseFloat(e.target.value)})} />
             </div>
             <button 
              onClick={() => onCameraTeleport(camInput.x, camInput.y, camInput.z)}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white p-1.5 rounded text-xs flex items-center justify-center gap-1 transition-colors"
            >
               <MapPin size={12} /> پرش به موقعیت
             </button>
             <div className="mt-2 text-center text-xs text-gray-500 font-mono">
               Position: {Math.round(cameraPos.x)}, {Math.round(cameraPos.y)}, {Math.round(cameraPos.z)}
             </div>
          </Panel>
        )}
      </div>

      {/* --- Footer Hints --- */}
      {uiPanels.hints && (
        <div className="absolute bottom-4 left-4 text-xs text-gray-500 pointer-events-none bg-white/80 backdrop-blur-sm p-2 rounded border border-gray-200 shadow-sm z-10">
          کلیک راست: چرخش • اسکرول: زوم • کلیک چپ: انتخاب/جابجایی
        </div>
      )}
    </>
  );
};