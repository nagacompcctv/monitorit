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
import { Loader2, Save, Plus, Trash2, Edit2, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

const initialNodes: Node[] = [
  {
    id: 'ceo',
    position: { x: 400, y: 50 },
    data: { 
      label: 'CEO / Direktur Utama',
      name: 'Pimpinan Tertinggi',
      department: 'Direksi',
      rawLabel: 'CEO / Direktur Utama'
    },
    style: { backgroundColor: '#fca5a5', border: 'none', padding: '10px', borderRadius: '12px', minWidth: '200px' }
  }
];

const initialEdges: Edge[] = [];

export default function OrgStructure() {
  return (
    <ReactFlowProvider>
      <OrgInner />
    </ReactFlowProvider>
  );
}

function OrgInner() {
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
    label: '', // Position Name
    name: '', // Person Name
    department: '',
    description: '',
    bgColor: '#ffffff'
  });

  const isAdmin = user?.role === 'head_of_it' || 
                  user?.role === 'administrator' || 
                  user?.role === 'supervisor' || 
                  user?.role === 'manager' || 
                  user?.role === 'it_admin';

  // Memoize the node renderer
  const nodesWithData = useMemo(() => {
    return nodes.map(node => {
      if (!node.data) return node;

      const isSelected = node.selected;

      const nodeObj = {
        ...node,
        data: {
          ...node.data,
          label: (
            <div className="flex flex-col items-center p-2">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                  {(node.data.label as string) || 'Posisi'}
                </div>
                <div className="text-sm font-black text-gray-900 border-b border-gray-100 pb-1 mb-1">
                  {(node.data.name as string) || 'Nama Lengkap'}
                </div>
                {node.data.department && (
                  <div className="text-[9px] font-bold text-gray-400 uppercase">
                    {node.data.department as string}
                  </div>
                )}
                {node.data.description && (
                  <div className="text-[8px] font-normal mt-1 text-gray-500 leading-tight italic">
                    {node.data.description as string}
                  </div>
                )}
              </div>
            </div>
          )
        }
      };

      return {
        ...nodeObj,
        style: {
          ...nodeObj.style,
          outline: isSelected ? '2px solid #3b82f6' : 'none',
          outlineOffset: '2px',
          boxShadow: isSelected ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #f3f4f6',
        }
      };
    });
  }, [nodes]);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'organization', 'structure'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.nodes) setNodes(data.nodes);
          if (data.edges) {
            setEdges(data.edges.map((e: any) => ({ 
              ...e, 
              type: 'step',
              animated: e.animated !== false 
            })));
          }
          if (data.viewport) {
            setViewport(data.viewport);
          }
        }
      } catch (err) {
        console.error("Error fetching org structure:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, [setNodes, setEdges, setViewport]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'step', animated: true }, eds)),
    [setEdges],
  );

  const saveOrg = async () => {
    if (!isAdmin) return;
    setSaving(true);
    
    const viewport = getViewport();
    
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
      const nodesToSave = nodes.map(n => {
        const nodeData = n.data || {};
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

      await setDoc(doc(db, 'organization', 'structure'), cleanObject({
        nodes: nodesToSave,
        edges: edges,
        viewport: viewport,
        updated_at: new Date()
      }));
      alert('Struktur berhasil disimpan!');
    } catch (err) {
      console.error("Error saving org structure:", err);
      alert('Gagal menyimpan struktur.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNode = () => {
    setEditingNode(null);
    setNodeFormData({
      label: '',
      name: '',
      department: '',
      description: '',
      bgColor: '#ffffff'
    });
    setIsModalOpen(true);
  };

  const onNodeDoubleClick = (_: React.MouseEvent, node: Node) => {
    if (!isAdmin) return;
    setEditingNode(node);
    const data = node.data || {};
    setNodeFormData({
      label: (typeof data.label === 'string' ? data.label : (data.rawLabel as string || '')) || '',
      name: (data.name as string) || '',
      department: (data.department as string) || '',
      description: (data.description as string) || '',
      bgColor: (node.style?.backgroundColor as string) || '#ffffff'
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
              name: nodeFormData.name,
              department: nodeFormData.department,
              description: nodeFormData.description,
              rawLabel: nodeFormData.label
            }
          };
        }
        return n;
      }));
    } else {
      const newNode: Node = {
        id: `person-${Date.now()}`,
        position: { x: 400, y: 200 },
        data: {
          label: nodeFormData.label,
          name: nodeFormData.name,
          department: nodeFormData.department,
          description: nodeFormData.description,
          rawLabel: nodeFormData.label
        },
        style: { 
          backgroundColor: nodeFormData.bgColor, 
          padding: '10px', 
          borderRadius: '12px',
          minWidth: '180px'
        }
      };
      setNodes(nds => [...nds, newNode]);
    }
    setIsModalOpen(false);
  };

  const deleteSelected = () => {
    const nodesRef = getNodes();
    const edgesRef = getEdges();
    const selectedNodes = nodesRef.filter(n => n.selected);
    const selectedEdges = edgesRef.filter(e => e.selected);
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Struktur Organisasi</h1>
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
                Tambah Anggota
              </button>
              <button 
                onClick={saveOrg}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-xl shadow-blue-600/20 hover:scale-105 transition-all uppercase disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan Struktur'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
          <MiniMap />
          <Background color="#cbd5e1" gap={16} />
        </ReactFlow>
      </div>

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
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">{editingNode ? 'Edit Anggota' : 'Tambah Anggota'}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Konfigurasi Struktur</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmitNode} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Lengkap</label>
                  <input 
                    type="text" required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nama Lengkap..."
                    value={nodeFormData.name}
                    onChange={e => setNodeFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Jabatan / Posisi</label>
                  <input 
                    type="text" required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Contoh: Manager IT"
                    value={nodeFormData.label}
                    onChange={e => setNodeFormData(prev => ({ ...prev, label: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Departemen</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Contoh: IT"
                      value={nodeFormData.department}
                      onChange={e => setNodeFormData(prev => ({ ...prev, department: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Warna Box</label>
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
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Keterangan Tambahan</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 resize-none h-24"
                    placeholder="Catatan..."
                    value={nodeFormData.description}
                    onChange={e => setNodeFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 px-6 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xs uppercase hover:bg-gray-200 transition-all">Batal</button>
                  <button type="submit" className="flex-1 py-4 px-6 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all">
                    {editingNode ? 'Simpan Perubahan' : 'Tambah'}
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
        title="Hapus Dari Struktur"
        message={confirmDeleteItems ? `Hapus ${confirmDeleteItems.nodes.length} anggota dan ${confirmDeleteItems.edges.length} relasi terpilih?` : ''}
      />
    </div>
  );
}
