
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import { FinancialYearData } from '../types';
import { Plus, Trash2, ArrowUp, ArrowDown, RefreshCw, Settings, ZoomIn, ZoomOut, Move, Split, Sliders, Smartphone } from 'lucide-react';

interface ProfitSankeyProps {
  data: FinancialYearData;
}

// Simple ID generator
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// Node types for our internal state
interface SankeyNodeConfig {
  id: string;
  name: string;
  value: number; // In Billions
  type: 'root' | 'source' | 'item';
  parentId?: string; // For 'item', who feeds me? For 'source', implicitly feeds root.
  color?: string;
  order: number;
}

const COLORS = {
  revenue: '#60a5fa', // Blue-400
  profit: '#34d399',  // Emerald-400 (Green)
  cost: '#f87171',    // Red-400
  expense: '#fb923c', // Orange-400
  source: '#93c5fd',  // Blue-300
  other: '#cbd5e1',   // Slate-300
};

// ... NodeRowEditor component stays the same
interface NodeRowEditorProps {
  node: SankeyNodeConfig;
  isSource?: boolean;
  availableParents: SankeyNodeConfig[];
  onUpdate: (id: string, updates: Partial<SankeyNodeConfig>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

const NodeRowEditor: React.FC<NodeRowEditorProps> = ({ 
  node, 
  isSource = false, 
  availableParents,
  onUpdate,
  onRemove,
  onMove
}) => (
     <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 transition-all hover:shadow-sm hover:border-indigo-200">
         <div className="flex gap-2 mb-2">
             <input 
                 type="text" 
                 value={node.name}
                 onChange={(e) => onUpdate(node.id, { name: e.target.value })}
                 className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none min-w-0"
             />
             <div className="relative w-20 flex-shrink-0">
                 <input 
                     type="number" 
                     value={node.value}
                     onChange={(e) => onUpdate(node.id, { value: Number(e.target.value) })}
                     className="w-full bg-white border border-gray-300 rounded pl-2 pr-5 py-1 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                 />
                 <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400">亿</span>
             </div>
         </div>
         
         {/* Config: Parent (Only for Items) & Color */}
         <div className="flex gap-2 mb-2">
             {!isSource && (
                 <div className="flex-1 flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1 min-w-0">
                    <span className="text-xs text-gray-400 flex-shrink-0">父级:</span>
                    <select 
                        value={node.parentId || ''}
                        onChange={(e) => onUpdate(node.id, { parentId: e.target.value })}
                        className="w-full text-xs bg-transparent outline-none text-gray-700 cursor-pointer truncate"
                    >
                        {availableParents.filter(p => p.id !== node.id).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                 </div>
             )}
             <div className="flex-1 flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1 min-w-0">
                 <span className="text-xs text-gray-400 flex-shrink-0">颜色:</span>
                 <select 
                     value={node.color}
                     onChange={(e) => onUpdate(node.id, { color: e.target.value })}
                     className="w-full text-xs bg-transparent outline-none text-gray-700 cursor-pointer truncate"
                 >
                     <option value={COLORS.profit}>利润 (绿)</option>
                     <option value={COLORS.cost}>成本 (红)</option>
                     <option value={COLORS.expense}>费用 (橙)</option>
                     <option value={COLORS.source}>业务 (蓝)</option>
                     <option value={COLORS.other}>其他 (灰)</option>
                 </select>
             </div>
         </div>

         <div className="flex justify-between items-center">
             <div className="flex gap-1">
                 <button onClick={() => onMove(node.id, 'up')} className="p-1 hover:bg-gray-200 rounded text-gray-400 transition-colors flex-shrink-0"><ArrowUp className="w-3 h-3" /></button>
                 <button onClick={() => onMove(node.id, 'down')} className="p-1 hover:bg-gray-200 rounded text-gray-400 transition-colors flex-shrink-0"><ArrowDown className="w-3 h-3" /></button>
             </div>
             <button onClick={() => onRemove(node.id)} className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"><Trash2 className="w-3 h-3" /></button>
         </div>
     </div>
);

const ProfitSankey: React.FC<ProfitSankeyProps> = ({ data }) => {
  // Convert initial data to billions
  const initialRevenue = data.revenue / 1e8;

  const [nodes, setNodes] = useState<SankeyNodeConfig[]>([]);

  // Pan & Zoom State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Visual Customization State
  const [visualConfig, setVisualConfig] = useState({
    nodeWidth: 15,
    nodePadding: 40,
    linkOpacity: 0.4
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Default State
  useEffect(() => {
    resetToDefault();
  }, [data]);

  const resetToDefault = () => {
    let sourceNodes: SankeyNodeConfig[] = [];

    // 0. Source: Check for extracted business composition
    if (data.businessComposition && data.businessComposition.length > 0) {
        sourceNodes = data.businessComposition.map((item, index) => ({
            id: `source_${index}`,
            name: item.name,
            value: item.value / 1e8,
            type: 'source',
            order: index,
            color: COLORS.source
        }));
    } else {
        // Fallback default
        sourceNodes = [{
            id: 'default_source',
            name: '主营业务',
            value: initialRevenue, // Default to full revenue
            type: 'source',
            order: 0,
            color: COLORS.source
        }];
    }

    // 1. Root: Revenue
    const revenueNode: SankeyNodeConfig = {
      id: 'revenue',
      name: '营业收入',
      value: initialRevenue,
      type: 'root',
      order: 0,
      color: COLORS.revenue
    };

    // 2. Level 1 Children (Revenue -> ...)
    // Ordered to put Net Profit at top
    
    // 2a. Net Profit
    const netProfitNode: SankeyNodeConfig = {
      id: 'net_profit',
      name: '净利润',
      value: data.netProfitParent / 1e8,
      type: 'item',
      parentId: 'revenue',
      order: 0,
      color: COLORS.profit
    };

    // 2b. Tax & Others (Extract tax if available, otherwise it falls into residual)
    const taxValue = (data.taxExpenses || 0) / 1e8;
    const taxNode: SankeyNodeConfig = {
      id: 'tax_expenses',
      name: '税费及其他',
      value: taxValue, 
      type: 'item',
      parentId: 'revenue',
      order: 1,
      color: COLORS.other
    };

    // 2c. Operating Expenses (Parent for next level)
    const sales = (data.salesExpenses || 0) / 1e8;
    const mgmt = (data.managementExpenses || 0) / 1e8;
    const fin = (data.financialExpenses || 0) / 1e8;
    const rd = (data.researchExpenses || 0) / 1e8;
    
    const totalOpEx = sales + mgmt + fin + rd;
    
    const opExpensesNode: SankeyNodeConfig = {
      id: 'op_expenses',
      name: '营业费用',
      value: totalOpEx > 0 ? totalOpEx : 0, 
      type: 'item',
      parentId: 'revenue',
      order: 2,
      color: COLORS.expense
    };

    // 2d. Cost of Revenue - Explicitly separated as requested
    const costNode: SankeyNodeConfig = {
      id: 'cost_revenue',
      name: '营业成本',
      value: (data.costOfRevenue || 0) / 1e8,
      type: 'item',
      parentId: 'revenue',
      order: 3,
      color: COLORS.cost
    };

    const allNodes = [
        ...sourceNodes,
        revenueNode, 
        netProfitNode, 
        taxNode, 
        opExpensesNode, 
        costNode
    ];

    // FILTER: Remove nodes with 0 or negligible value (except Root)
    setNodes(allNodes.filter(n => n.type === 'root' || n.value > 0.001));
    
    // Reset view
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // --- Logic to Generate Recharts Sankey Data ---
  const sankeyData = useMemo(() => {
    const chartNodes: any[] = [];
    const chartLinks: any[] = [];
    
    // Map internal IDs to array indices for Recharts
    const idToIndex = new Map<string, number>();
    
    // Helper to add node if not exists
    const getOrAddNode = (id: string, name: string, color: string = COLORS.other) => {
      if (!idToIndex.has(id)) {
        chartNodes.push({ name, color }); // Recharts node object
        idToIndex.set(id, chartNodes.length - 1);
      }
      return idToIndex.get(id)!;
    };

    // 1. Process Root (Revenue)
    const root = nodes.find(n => n.type === 'root');
    if (!root) return { nodes: [], links: [] };

    const rootIdx = getOrAddNode(root.id, root.name, root.color);

    // 2. Process Sources (Left Side) -> Root
    const sources = nodes.filter(n => n.type === 'source').sort((a, b) => a.order - b.order);
    let totalSourceValue = 0;
    
    sources.forEach(source => {
      if (source.value <= 0.001) return; // Skip zero value sources
      const sourceIdx = getOrAddNode(source.id, source.name, source.color || COLORS.source);
      chartLinks.push({
        source: sourceIdx,
        target: rootIdx,
        value: source.value
      });
      totalSourceValue += source.value;
    });

    // Add "Other Sources" if sources don't sum up to Revenue
    if (totalSourceValue < root.value - 0.01) { // Epsilon for float
      const otherSourceVal = root.value - totalSourceValue;
      const otherIdx = getOrAddNode('other_source', '其他/未分配来源', COLORS.other);
      chartLinks.push({
        source: otherIdx,
        target: rootIdx,
        value: otherSourceVal
      });
    }

    // 3. Process Items (Right Side) - Recursive flow
    
    // Get all potential parents (Root + Items)
    const potentialParents = [root, ...nodes.filter(n => n.type === 'item')];

    potentialParents.forEach(parent => {
      // Find children linked to this parent
      const children = nodes
        .filter(n => n.type === 'item' && n.parentId === parent.id)
        .sort((a, b) => a.order - b.order); // Order determines vertical render position in Sankey
      
      if (children.length > 0) {
        let totalChildValue = 0;
        const parentIdx = getOrAddNode(parent.id, parent.name, parent.color);

        children.forEach(child => {
            if (child.value > 0.001) { // Only link if value > 0
                const childIdx = getOrAddNode(child.id, child.name, child.color || COLORS.cost);
                chartLinks.push({
                    source: parentIdx,
                    target: childIdx,
                    value: child.value
                });
                totalChildValue += child.value;
            }
        });

        // Add "Other/Residual" if children don't sum up to Parent
        if (totalChildValue < parent.value - 0.01) {
            const residualVal = parent.value - totalChildValue;
            // Determine name for residual based on parent
            let residualName = '其他/未分配';
            if (parent.id === 'revenue') residualName = '其他/未分配';
            if (parent.id === 'op_expenses') residualName = '其他费用';
            
            const residualIdx = getOrAddNode(`${parent.id}_residual`, residualName, COLORS.other);
            chartLinks.push({
                source: parentIdx,
                target: residualIdx,
                value: residualVal
            });
        }
      }
    });

    return { nodes: chartNodes, links: chartLinks };
  }, [nodes]);

  // --- Handlers ---

  const addNode = (type: 'source' | 'item') => {
    const id = generateId();
    const newNode: SankeyNodeConfig = type === 'source' 
      ? {
          id,
          name: '新业务来源',
          value: 0,
          type: 'source',
          order: nodes.length,
          color: COLORS.source
        }
      : {
          id,
          name: '新项目',
          value: 0,
          type: 'item',
          parentId: 'revenue', // Default to linking from Revenue
          order: nodes.length,
          color: COLORS.cost
        };
    setNodes([...nodes, newNode]);
  };

  const updateNode = (id: string, updates: Partial<SankeyNodeConfig>) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
  };

  const moveNode = (id: string, direction: 'up' | 'down') => {
    const index = nodes.findIndex(n => n.id === id);
    if (index === -1) return;
    
    // Swap logic needs to respect groups (same parent or same type for sources)
    const node = nodes[index];
    let siblings: SankeyNodeConfig[] = [];

    if (node.type === 'source') {
        siblings = nodes.filter(n => n.type === 'source').sort((a, b) => a.order - b.order);
    } else if (node.type === 'item') {
        siblings = nodes.filter(n => n.type === 'item' && n.parentId === node.parentId)
                          .sort((a, b) => a.order - b.order);
    }
    
    const siblingIndex = siblings.findIndex(n => n.id === id);
    if (direction === 'up' && siblingIndex > 0) {
        const prevSibling = siblings[siblingIndex - 1];
        // Swap orders
        const tempOrder = node.order;
        updateNode(node.id, { order: prevSibling.order });
        updateNode(prevSibling.id, { order: tempOrder });
    } else if (direction === 'down' && siblingIndex < siblings.length - 1) {
        const nextSibling = siblings[siblingIndex + 1];
        // Swap orders
        const tempOrder = node.order;
        updateNode(node.id, { order: nextSibling.order });
        updateNode(nextSibling.id, { order: tempOrder });
    }
  };

  // --- Pan & Zoom Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    setTransform(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 3) }));
  };

  const handleZoomOut = () => {
    setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.5) }));
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // --- Custom Rendering for Sankey ---
  const renderCustomNode = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    
    return (
      <Layer key={`node-${index}`}>
        <Rectangle
          x={x} y={y} width={width} height={height}
          fill={payload.color || '#8884d8'}
          fillOpacity={1}
          radius={[4, 4, 4, 4]}
        />
        {/* Label */}
        <text
          x={x + width + 6}
          y={y + height / 2}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="bold"
          fill="#334155"
          style={{ pointerEvents: 'none' }} 
        >
          {payload.name}
        </text>
        {/* Value */}
        <text
          x={x + width + 6}
          y={y + height / 2 + 14}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize="10"
          fill="#64748b"
          style={{ pointerEvents: 'none' }}
        >
          {payload.value.toFixed(2)}亿 ({((payload.value / initialRevenue) * 100).toFixed(1)}%)
        </text>
      </Layer>
    );
  };

  // Group nodes for Editor
  const sourceNodes = nodes.filter(n => n.type === 'source').sort((a, b) => a.order - b.order);
  const itemNodes = nodes.filter(n => n.type === 'item').sort((a, b) => a.order - b.order);
  const rootNode = nodes.find(n => n.type === 'root');
  
  // Potential parents list (Revenue + any Items)
  const availableParents = rootNode ? [rootNode, ...itemNodes] : itemNodes;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[500px] lg:min-h-[600px] animate-fade-in select-none">
      
      {/* LEFT: Sankey Chart Area with Pan/Zoom */}
      <div className="lg:col-span-8 bg-white p-0 rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative group">
         <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-gray-100 max-w-[70%]">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
                <div className="w-1 h-6 bg-indigo-500 rounded-full flex-shrink-0"></div>
                利润结构桑基图 (亿元)
            </h3>
            <p className="text-[10px] md:text-xs text-gray-400 mt-1 hidden md:block">
                 * 滚轮缩放 / 拖拽移动视图
             </p>
         </div>

         {/* Mobile Rotate Hint */}
         <div className="md:hidden absolute top-4 right-4 z-10 text-gray-400 bg-white/80 p-1.5 rounded-full shadow-sm">
             <Smartphone className="w-5 h-5 animate-pulse" />
         </div>

         {/* Chart Controls */}
         <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
            <button onClick={handleZoomIn} className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 text-gray-600 transition-colors">
                <ZoomIn className="w-5 h-5 flex-shrink-0" />
            </button>
            <button onClick={handleResetView} className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 text-gray-600 transition-colors">
                <Move className="w-5 h-5 flex-shrink-0" />
            </button>
            <button onClick={handleZoomOut} className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 text-gray-600 transition-colors">
                <ZoomOut className="w-5 h-5 flex-shrink-0" />
            </button>
         </div>
         
         {/* Interactive Canvas */}
         <div 
            ref={containerRef}
            className="flex-1 w-full h-[500px] md:h-[600px] cursor-move bg-slate-50 relative overflow-x-auto overflow-y-hidden no-scrollbar"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
         >
             {/* Inner container with min-width to ensure sankey is readable on mobile */}
            <div 
                style={{ 
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                    width: '100%',
                    minWidth: '600px', // Force horizontal scroll on small screens
                    height: '100%'
                }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <Sankey
                        data={sankeyData}
                        node={renderCustomNode}
                        nodeWidth={visualConfig.nodeWidth}
                        nodePadding={visualConfig.nodePadding}
                        margin={{ left: 20, right: 150, top: 50, bottom: 50 }}
                        link={{ stroke: '#cbd5e1', strokeOpacity: visualConfig.linkOpacity }}
                        sort={false} // Important to respect our manual ordering
                    >
                        <Tooltip 
                        content={({ payload }) => {
                            if (!payload || !payload.length) return null;
                            const data = payload[0];
                            const isLink = !!data.payload.source;
                            if (isLink) {
                                const sourceName = (data.payload.source as any).name;
                                const targetName = (data.payload.target as any).name;
                                return (
                                    <div className="bg-white p-3 rounded shadow-lg border text-sm">
                                        <div className="font-semibold">{sourceName} → {targetName}</div>
                                        <div>金额: {data.value.toFixed(2)} 亿元</div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="bg-white p-3 rounded shadow-lg border text-sm">
                                        <div className="font-semibold">{data.payload.name}</div>
                                        <div>金额: {data.value.toFixed(2)} 亿元</div>
                                        <div>占比: {((data.value / initialRevenue) * 100).toFixed(2)}%</div>
                                    </div>
                                );
                            }
                        }}
                        />
                    </Sankey>
                </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* RIGHT: Editor Panel */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        
        <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 flex-1 overflow-y-auto max-h-[500px] lg:max-h-[calc(100vh-140px)]">
             <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 py-2 border-b border-gray-100">
                 <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                     <Settings className="w-4 h-4 text-gray-500 flex-shrink-0" />
                     数据明细与调整
                 </h4>
                 <button 
                    onClick={resetToDefault} 
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                    title="重置"
                 >
                     <RefreshCw className="w-4 h-4 flex-shrink-0" />
                 </button>
             </div>

            {/* NEW: Visual Settings Section */}
             <div className="mb-6 bg-gray-50 p-3 rounded-lg border border-gray-200">
                 <div className="flex items-center gap-2 mb-3">
                     <Sliders className="w-4 h-4 text-gray-500 flex-shrink-0" />
                     <span className="text-xs font-bold text-gray-700 uppercase">样式调整</span>
                 </div>
                 <div className="space-y-3">
                     <div>
                         <div className="flex justify-between text-xs text-gray-600 mb-1">
                             <span>节点宽度</span>
                             <span>{visualConfig.nodeWidth}px</span>
                         </div>
                         <input 
                            type="range" min="5" max="50" 
                            value={visualConfig.nodeWidth}
                            onChange={(e) => setVisualConfig(prev => ({ ...prev, nodeWidth: Number(e.target.value) }))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                         />
                     </div>
                     <div>
                         <div className="flex justify-between text-xs text-gray-600 mb-1">
                             <span>节点间距</span>
                             <span>{visualConfig.nodePadding}px</span>
                         </div>
                         <input 
                            type="range" min="0" max="100" 
                            value={visualConfig.nodePadding}
                            onChange={(e) => setVisualConfig(prev => ({ ...prev, nodePadding: Number(e.target.value) }))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                         />
                     </div>
                     <div>
                         <div className="flex justify-between text-xs text-gray-600 mb-1">
                             <span>连线透明度</span>
                             <span>{Math.round(visualConfig.linkOpacity * 100)}%</span>
                         </div>
                         <input 
                            type="range" min="0.1" max="1" step="0.1"
                            value={visualConfig.linkOpacity}
                            onChange={(e) => setVisualConfig(prev => ({ ...prev, linkOpacity: Number(e.target.value) }))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                         />
                     </div>
                 </div>
             </div>

             {/* Section: Revenue Sources */}
             <div className="mb-6">
                 <div className="flex justify-between items-center mb-2">
                     <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                         <Split className="w-3 h-3 flex-shrink-0" />
                         营收来源明细 (左侧)
                     </label>
                     <button onClick={() => addNode('source')} className="text-xs flex items-center gap-1 text-indigo-600 font-medium hover:bg-indigo-50 px-2 py-1 rounded flex-shrink-0">
                         <Plus className="w-3 h-3 flex-shrink-0" /> 添加来源
                     </button>
                 </div>
                 <div className="space-y-3">
                     {sourceNodes.length === 0 && (
                         <div className="text-center p-3 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400">
                             暂无营收来源明细，将自动显示为“其他业务”
                         </div>
                     )}
                     {sourceNodes.map(node => (
                         <NodeRowEditor 
                            key={node.id} 
                            node={node} 
                            isSource={true} 
                            availableParents={availableParents}
                            onUpdate={updateNode}
                            onRemove={removeNode}
                            onMove={moveNode}
                        />
                     ))}
                 </div>
                 <div className="mt-2 text-right">
                     <span className="text-xs text-gray-400">
                         总计: {sourceNodes.reduce((acc, n) => acc + n.value, 0).toFixed(2)}亿 
                         / 
                         营收: {initialRevenue.toFixed(2)}亿
                     </span>
                 </div>
             </div>

             {/* Section: Distribution */}
             <div>
                 <div className="flex justify-between items-center mb-2">
                     <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                         <Split className="w-3 h-3 rotate-180 flex-shrink-0" />
                         成本与利润分配 (右侧)
                     </label>
                     <button onClick={() => addNode('item')} className="text-xs flex items-center gap-1 text-indigo-600 font-medium hover:bg-indigo-50 px-2 py-1 rounded flex-shrink-0">
                         <Plus className="w-3 h-3 flex-shrink-0" /> 添加项目
                     </button>
                 </div>
                 <div className="space-y-3">
                     {itemNodes.map(node => (
                         <NodeRowEditor 
                            key={node.id} 
                            node={node} 
                            isSource={false} 
                            availableParents={availableParents}
                            onUpdate={updateNode}
                            onRemove={removeNode}
                            onMove={moveNode}
                        />
                     ))}
                 </div>
             </div>

        </div>
      </div>
    </div>
  );
};

export default ProfitSankey;
