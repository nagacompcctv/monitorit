import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position,
  Connection,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { collection, doc, getDoc, setDoc } from '../lib/firebase';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { Loader2, Save, Plus, Trash2, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

const initialNodes: Node[] = [
  {
    id: 'server',
    position: { x: 400, y: 50 },
    data: { 
      label: 'MIKROTIK SERVER',
      rawLabel: 'MIKROTIK SERVER',
      ipStaff: '172.16.16.0/24',
      description: '- IP PUBLIC 36.95.224.200/32\n- Domestik 100 mbps\n- Global 10 mbps'
    },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px', minWidth: '200px' }
  },
  {
    id: 'cloud',
    position: { x: 400, y: 200 },
    data: { label: 'Internet / Cloud', rawLabel: 'Internet / Cloud' },
    style: { backgroundColor: '#e0f2fe', border: '2px solid #0284c7', borderRadius: '50%', width: '150px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  },
  // Locations
  {
    id: 'boto',
    position: { x: -200, y: 350 },
    data: { label: 'MIKROTIK MASJID BOTO', rawLabel: 'MIKROTIK MASJID BOTO', speed: '50 mbps', ipStaff: '172.16.40.0/24', ipCctv: '172.16.41.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'holding',
    position: { x: 0, y: 350 },
    data: { label: 'MIKROTIK HOLDING', rawLabel: 'MIKROTIK HOLDING', speed: '100 mbps', ipStaff: '172.16.18.0/24', ipCctv: '172.16.19.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'rnd',
    position: { x: 200, y: 350 },
    data: { label: 'MIKROTIK RND & GC', rawLabel: 'MIKROTIK RND & GC', speed: '150 mbps', ipStaff: '172.16.20.0/24', ipCctv: '172.16.21.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'gambiran',
    position: { x: 400, y: 350 },
    data: { label: 'MIKROTIK GAMBIRAN', rawLabel: 'MIKROTIK GAMBIRAN', speed: '150 mbps', ipStaff: '172.16.22.0/24', ipCctv: '172.16.23.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'teblon',
    position: { x: 600, y: 350 },
    data: { label: 'MIKROTIK TEBLON', rawLabel: 'MIKROTIK TEBLON', speed: '150 mbps', ipStaff: '172.16.24.0/24', ipCctv: '172.16.25.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'phytomed',
    position: { x: 800, y: 350 },
    data: { label: 'MIKROTIK PHYTOMED', rawLabel: 'MIKROTIK PHYTOMED', speed: '150 mbps', ipStaff: '172.16.26.0/24', ipCctv: '172.16.27.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'zan',
    position: { x: -200, y: 500 },
    data: { label: 'MIKROTIK ZAN & INF', rawLabel: 'MIKROTIK ZAN & INF', speed: '200 mbps', ipStaff: '172.16.28.0/24', ipCctv: '172.16.29.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'kime',
    position: { x: 0, y: 500 },
    data: { label: 'MIKROTIK KIME', rawLabel: 'MIKROTIK KIME', speed: '300 mbps', ipStaff: '172.16.30.0/24', ipCctv: '172.16.31.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'garasi',
    position: { x: 200, y: 500 },
    data: { label: 'MIKROTIK GARASI', rawLabel: 'MIKROTIK GARASI', speed: '50 mbps', ipStaff: '172.16.32.0/24', ipCctv: '172.16.33.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'it',
    position: { x: 400, y: 500 },
    data: { label: 'MIKROTIK IT', rawLabel: 'MIKROTIK IT', speed: '100 mbps', ipStaff: '172.16.34.0/24', ipCctv: '172.16.35.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'g_trangsan',
    position: { x: 600, y: 500 },
    data: { label: 'MIKROTIK G.TRANGSAN', rawLabel: 'MIKROTIK G.TRANGSAN', speed: '50 mbps', ipStaff: '172.16.36.0/24', ipCctv: '172.16.37.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  },
  {
    id: 'g_mayang',
    position: { x: 800, y: 500 },
    data: { label: 'MIKROTIK G.MAYANG', rawLabel: 'MIKROTIK G.MAYANG', speed: '50 mbps', ipStaff: '172.16.38.0/24', ipCctv: '172.16.39.0/24' },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '8px' }
  }
];

const initialEdges: Edge[] = [
  { id: 'server-cloud', source: 'server', target: 'cloud', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-boto', source: 'cloud', target: 'boto', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-holding', source: 'cloud', target: 'holding', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-rnd', source: 'cloud', target: 'rnd', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-gambiran', source: 'cloud', target: 'gambiran', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-teblon', source: 'cloud', target: 'teblon', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-phytomed', source: 'cloud', target: 'phytomed', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-zan', source: 'cloud', target: 'zan', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-kime', source: 'cloud', target: 'kime', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-garasi', source: 'cloud', target: 'garasi', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-it', source: 'cloud', target: 'it', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-g_trangsan', source: 'cloud', target: 'g_trangsan', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
  { id: 'cloud-g_mayang', source: 'cloud', target: 'g_mayang', type: 'step', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
];

export default function NetworkTopology() {
  return (
    <ReactFlowProvider>
      <TopologyInner />
    </ReactFlowProvider>
  );
}

function TopologyInner() {
  const { user } = useAuth();
  const { deleteElements, getNodes, getEdges, getViewport, setViewport } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [confirmDeleteItems, setConfirmDeleteItems] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);
  const [nodeFormData, setNodeFormData] = useState({
    label: '',
    speed: '',
    ipStaff: '',
    ipCctv: '',
    description: '',
    bgColor: '#fca5a5'
  });

  const isAdmin = user?.role === 'head_of_it' || 
                  user?.role === 'administrator' || 
                  user?.role === 'supervisor' || 
                  user?.role === 'manager' || 
                  user?.role === 'staff_hardware' ||
                  user?.role === 'it_admin';

  // Memoize the node renderer to handle both static (initial) and dynamic nodes
  const nodesWithData = useMemo(() => {
    return nodes.map(node => {
      // Safety check for node.data
      if (!node.data) return node;

      // Use node.selected from the node object itself
      const isSelected = node.selected;

      // If node has custom data fields (speed, ipStaff, etc.), render them dynamically
      const nodeObj = (node.data.speed || node.data.ipStaff || node.data.ipCctv || node.data.description) ? {
        ...node,
        data: {
          ...node.data,
          label: (
            <div className="text-center font-bold">
              {node.data.speed && <div className="mb-1 text-blue-600 text-[10px]">{node.data.speed}</div>}
              <div className="text-xs uppercase">{node.data.label as string}</div>
              {(node.data.ipStaff || node.data.ipCctv) && (
                <div className="text-[10px] font-normal mt-1 text-gray-700">
                  {node.data.ipStaff && <div>{node.data.ipStaff}</div>}
                  {node.data.ipCctv && <div className="text-blue-500 font-medium">CCTV: {node.data.ipCctv}</div>}
                </div>
              )}
              {node.data.description && (
                <div className="text-[9px] font-normal mt-1 text-gray-600 leading-tight whitespace-pre-wrap">
                  {node.data.description}
                </div>
              )}
            </div>
          )
        }
      } : node;

      // Add visual selection style
      return {
        ...nodeObj,
        style: {
          ...nodeObj.style,
          outline: isSelected ? '2px solid #3b82f6' : 'none',
          outlineOffset: '2px',
          boxShadow: isSelected ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : nodeObj.style?.boxShadow || 'none',
        }
      };
    });
  }, [nodes]);

  useEffect(() => {
    const fetchTopology = async () => {
      try {
        const docRef = doc(db, 'topology', 'main');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.nodes) {
            setNodes(data.nodes);
          }
          if (data.edges) {
            // Force edges to be 'step' type for orthogonal connections
            setEdges(data.edges.map((e: any) => ({ 
              ...e, 
              type: 'step',
              animated: e.animated !== false // keep animated unless explicitly disabled
            })));
          }
          if (data.viewport) {
            setViewport(data.viewport);
          }
        }
      } catch (err) {
        console.error("Error loading topology:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTopology();
  }, [setNodes, setEdges, setViewport]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'step', animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  const saveTopology = async () => {
    if (!isAdmin) return;
    setSaving(true);
    
    const viewport = getViewport();
    
    // Helper to recursively remove undefined values which Firestore doesn't like
    const cleanObject = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(cleanObject);
      
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, cleanObject(v)])
      );
    };

    try {
      // When saving, we need to strip React components from data.label if any
      // For dynamic nodes, data.label is just a string.
      // For initial static nodes, it might be JSX. We'll handle this by only saving nodes that have string labels or custom data.
      const nodesToSave = nodes.map(n => {
        // Ensure data object exists
        const nodeData = n.data || {};
        
        // If label is not a string (e.g. JSX), fallback to rawLabel or 'Node'
        let labelToSave = nodeData.label;
        if (typeof labelToSave !== 'string') {
          labelToSave = nodeData.rawLabel || 'Node';
        }

        return {
          ...n,
          data: {
            ...nodeData,
            label: labelToSave
          }
        };
      });

      await setDoc(doc(db, 'topology', 'main'), cleanObject({
        nodes: nodesToSave,
        edges: edges,
        viewport: viewport,
        updated_at: new Date()
      }));
      alert('Topologi berhasil disimpan!');
    } catch (err) {
      console.error("Error saving topology:", err);
      alert('Gagal menyimpan topologi');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNode = () => {
    setEditingNode(null);
    setNodeFormData({
      label: 'Node Baru',
      speed: '',
      ipStaff: '',
      ipCctv: '',
      bgColor: '#fca5a5'
    });
    setIsModalOpen(true);
  };

  const onNodeDoubleClick = (_: React.MouseEvent, node: Node) => {
    if (!isAdmin) return;
    setEditingNode(node);
    
    const data = node.data || {};
    setNodeFormData({
      label: (typeof data.label === 'string' ? data.label : (data.rawLabel as string || '')) || '',
      speed: (data.speed as string) || '',
      ipStaff: (data.ipStaff as string) || '',
      ipCctv: (data.ipCctv as string) || '',
      description: (data.description as string) || '',
      bgColor: (node.style?.backgroundColor as string) || '#fca5a5'
    });
    setIsModalOpen(true);
  };

  const handleSubmitNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNode) {
      setNodes(nds => nds.map(n => {
        if (n.id === editingNode.id) {
          return {
            ...n,
            style: { ...n.style, backgroundColor: nodeFormData.bgColor },
            data: {
              ...n.data,
              label: nodeFormData.label,
              speed: nodeFormData.speed,
              ipStaff: nodeFormData.ipStaff,
              ipCctv: nodeFormData.ipCctv,
              description: nodeFormData.description,
              rawLabel: nodeFormData.label
            }
          };
        }
        return n;
      }));
    } else {
      const newNode: Node = {
        id: `node-${Date.now()}`,
        position: { x: 100, y: 100 },
        data: {
          label: nodeFormData.label,
          speed: nodeFormData.speed,
          ipStaff: nodeFormData.ipStaff,
          ipCctv: nodeFormData.ipCctv,
          description: nodeFormData.description,
          rawLabel: nodeFormData.label
        },
        style: { 
          backgroundColor: nodeFormData.bgColor, 
          border: 'none', 
          padding: '10px', 
          borderRadius: '8px',
          minWidth: '150px'
        }
      };
      setNodes(nds => [...nds, newNode]);
    }
    setIsModalOpen(false);
  };

  const deleteSelected = () => {
    const nodes = getNodes();
    const edges = getEdges();
    const selectedNodes = nodes.filter(n => n.selected);
    const selectedEdges = edges.filter(e => e.selected);
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      // Small custom alert for "nothing selected"
      return;
    }

    setConfirmDeleteItems({ nodes: selectedNodes, edges: selectedEdges });
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteItems) {
      deleteElements(confirmDeleteItems);
      setConfirmDeleteItems(null);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Topologi Jaringan</h1>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Dua Naga Corporation</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <button 
                onClick={deleteSelected}
                className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-xl font-bold text-xs hover:bg-red-100 transition-all uppercase"
              >
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
              <button 
                onClick={handleAddNode}
                className="flex items-center gap-2 bg-white text-gray-700 border border-gray-100 px-4 py-3 rounded-xl font-bold text-xs shadow-sm hover:bg-gray-50 transition-all uppercase"
              >
                <Plus className="w-4 h-4" />
                Tambah Node
              </button>
              <button 
                onClick={saveTopology}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-xl shadow-blue-600/20 hover:scale-105 transition-all uppercase disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan Layout'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 text-gray-400">
            <div className="flex flex-col items-center">
               <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
               <p className="text-[10px] font-bold uppercase">Memuat Topologi...</p>
            </div>
          </div>
        ) : null}
        
        <ReactFlow
          nodes={nodesWithData}
          edges={edges}
          onNodesChange={isAdmin ? onNodesChange : undefined}
          onEdgesChange={isAdmin ? onEdgesChange : undefined}
          onConnect={isAdmin ? onConnect : undefined}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodesDelete={(deleted) => {
            if (!isAdmin) return;
            setNodes((nds) => nds.filter((node) => !deleted.find((d) => d.id === node.id)));
          }}
          onEdgesDelete={(deleted) => {
            if (!isAdmin) return;
            setEdges((eds) => eds.filter((edge) => !deleted.find((d) => d.id === edge.id)));
          }}
          nodesDraggable={isAdmin}
          nodesConnectable={isAdmin}
          elementsSelectable={isAdmin}
          defaultEdgeOptions={{ type: 'step' }}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap zoomable pannable />
          <Background color="#cbd5e1" gap={16} />
        </ReactFlow>
      </div>

      {/* Edit Node Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">{editingNode ? 'Edit Node' : 'Tambah Node'}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Konfigurasi Perangkat Jaringan</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmitNode} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Perangkat / Label</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-300"
                    placeholder="Contoh: MIKROTIK HOLDING"
                    value={nodeFormData.label}
                    onChange={e => setNodeFormData(prev => ({ ...prev, label: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Speed (Bandwidth)</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-300"
                      placeholder="Contoh: 100 mbps"
                      value={nodeFormData.speed}
                      onChange={e => setNodeFormData(prev => ({ ...prev, speed: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Warna Background</label>
                    <div className="flex items-center gap-2 h-[58px]">
                      <input 
                        type="color"
                        className="w-full h-full bg-transparent border-none cursor-pointer"
                        value={nodeFormData.bgColor}
                        onChange={e => setNodeFormData(prev => ({ ...prev, bgColor: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">IP STAFF</label>
                  <input 
                    type="text"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-300"
                    placeholder="Contoh: 172.16.18.0/24"
                    value={nodeFormData.ipStaff}
                    onChange={e => setNodeFormData(prev => ({ ...prev, ipStaff: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Keterangan / Deskripsi</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-300 resize-none h-24"
                    placeholder="Contoh: - IP PUBLIC 36.95.224.200/32"
                    value={nodeFormData.description}
                    onChange={e => setNodeFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 px-6 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xs uppercase hover:bg-gray-200 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 px-6 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all"
                  >
                    {editingNode ? 'Simpan Perubahan' : 'Tambah Perangkat'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!confirmDeleteItems}
        onClose={() => setConfirmDeleteItems(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Item Terpilih"
        message={confirmDeleteItems ? `Hapus ${confirmDeleteItems.nodes.length} node dan ${confirmDeleteItems.edges.length} edge terpilih? Tindakan ini tidak dapat dibatalkan.` : ''}
      />
    </div>
  );
}
