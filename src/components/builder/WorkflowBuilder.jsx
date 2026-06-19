import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow, addEdge, useNodesState, useEdgesState,
  Controls, Background, BackgroundVariant, MiniMap,
  useUpdateNodeInternals,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import NodeSidebar from './NodeSidebar'
import NodeConfigPanel from './NodeConfigPanel'
import FlowNode from './nodes/FlowNode'
import QuickAddPopup from './QuickAddPopup'
import { Save, Loader2, Layers, Plus } from 'lucide-react'
import TemplateModal from './TemplateModal'

const nodeTypes = {
  start: FlowNode, form: FlowNode, ai: FlowNode, condition: FlowNode,
  decision: FlowNode, notification: FlowNode, upload: FlowNode, signature: FlowNode, end: FlowNode,
}

const initialNodes = [
  { id: 'start-1', type: 'start', position: { x: 300, y: 80 }, data: { label: 'Inicio' } },
]

function maxIdCounter(nodes) {
  return nodes.reduce((max, n) => {
    const num = parseInt(n.id.split('-').pop(), 10)
    return isNaN(num) ? max : Math.max(max, num)
  }, 1)
}

function DecisionHandleUpdater({ nodes }) {
  const updateNodeInternals = useUpdateNodeInternals()

  const signature = nodes
    .filter(n => n.type === 'decision')
    .map(n => `${n.id}:${(n.data.options || []).map(o => o.id).join(',')}`)
    .join('|')

  useEffect(() => {
    nodes
      .filter(n => n.type === 'decision')
      .forEach(n => updateNodeInternals(n.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  return null
}

export default function WorkflowBuilder({ workflow, onSave, saving }) {
  const startNodes = workflow?.nodes || initialNodes
  const [nodes, setNodes, onNodesChange] = useNodesState(startNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || [])
  const idCounterRef = useRef(maxIdCounter(startNodes))
  const [selectedNode, setSelectedNode] = useState(null)
  const reactFlowWrapper = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Quick-add button state
  const [quickAddState, setQuickAddState] = useState(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const dismissTimerRef = useRef(null)

  const onConnect = useCallback(
    params => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#1e40af', strokeWidth: 2 } }, eds)),
    [setEdges]
  )

  function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  function onDrop(e) {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    if (!type || !reactFlowInstance) return
    if (type === 'start' && nodes.some(n => n.type === 'start')) return
    const bounds = reactFlowWrapper.current.getBoundingClientRect()
    const position = reactFlowInstance.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top })
    const data = type === 'decision'
      ? { label: '', description: '', options: [] }
      : { label: '', description: '', fields: [] }
    setNodes(nds => [...nds, { id: `${type}-${++idCounterRef.current}`, type, position, data }])
  }

  function onNodeClick(_, node) { setSelectedNode(node) }
  function onPaneClick() { setSelectedNode(null) }

  function onDeleteNode(nodeId) {
    setNodes(nds => nds.filter(n => n.id !== nodeId))
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
    setSelectedNode(null)
  }

  function onNodeDataChange(nodeId, newData) {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: newData } : n))
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data: newData } : prev)
  }

  function onDeleteOptionEdge(nodeId, handleId) {
    setEdges(eds => eds.filter(e => !(e.source === nodeId && e.sourceHandle === handleId)))
  }

  // Quick-add: add a new node below an existing one, pre-connected
  function addNodeBelow(sourceNodeId, newType) {
    const source = nodes.find(n => n.id === sourceNodeId)
    if (!source) return
    if (newType === 'start' && nodes.some(n => n.type === 'start')) return
    const newId = `${newType}-${++idCounterRef.current}`
    const newNode = {
      id: newId,
      type: newType,
      position: { x: source.position.x, y: source.position.y + 130 },
      data: newType === 'decision'
        ? { label: '', description: '', options: [] }
        : { label: '', description: '', fields: [] },
    }
    const newEdge = {
      id: `e-${sourceNodeId}-${newId}-${Date.now()}`,
      source: sourceNodeId,
      target: newId,
      animated: true,
      style: { stroke: '#1e40af', strokeWidth: 2 },
    }
    setNodes(nds => [...nds, newNode])
    setEdges(eds => [...eds, newEdge])
  }

  function handleNodeMouseEnter(_, node) {
    if (node.type === 'end') return
    clearTimeout(dismissTimerRef.current)
    const el = reactFlowWrapper.current?.querySelector(`[data-id="${node.id}"]`)
    if (!el) return
    const rect = el.getBoundingClientRect()
    const wrapperRect = reactFlowWrapper.current.getBoundingClientRect()
    setQuickAddState({
      nodeId: node.id,
      left: rect.left - wrapperRect.left + rect.width / 2,
      top: rect.bottom - wrapperRect.top + 4,
    })
  }

  function handleNodeMouseLeave() {
    if (quickAddOpen) return
    dismissTimerRef.current = setTimeout(() => setQuickAddState(null), 180)
  }

  return (
    <div className="flex h-full">
      <NodeSidebar
        hasStart={nodes.some(n => n.type === 'start')}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
      />

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 text-sm font-medium px-3.5 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Layers className="w-4 h-4" />
            Plantillas
          </button>
          <button
            onClick={() => onSave({ nodes, edges })}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>

        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect} onInit={setReactFlowInstance}
          onDrop={onDrop} onDragOver={onDragOver}
          onNodeClick={onNodeClick} onPaneClick={onPaneClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.4, maxZoom: 0.85 }}
          defaultEdgeOptions={{ animated: true, style: { stroke: '#1e40af', strokeWidth: 2 } }}
        >
          <DecisionHandleUpdater nodes={nodes} />
          <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={20} size={1} />
          <Controls className="!border-slate-200 !shadow-sm" />
          <MiniMap
            nodeColor={n => {
              const colors = { start: '#10b981', form: '#1e40af', ai: '#7c3aed', condition: '#d97706', decision: '#4338ca', notification: '#ea580c', upload: '#0d9488', signature: '#7e22ce', end: '#dc2626' }
              return colors[n.type] || '#94a3b8'
            }}
            className="!border-slate-200 !shadow-sm"
          />
        </ReactFlow>

        {/* Quick-add overlay */}
        {quickAddState && (
          <div
            style={{
              position: 'absolute',
              left: quickAddState.left,
              top: quickAddState.top,
              transform: 'translateX(-50%)',
              zIndex: 20,
            }}
            onMouseEnter={() => clearTimeout(dismissTimerRef.current)}
            onMouseLeave={() => { setQuickAddOpen(false); setQuickAddState(null) }}
          >
            <button
              onClick={() => setQuickAddOpen(v => !v)}
              className="w-7 h-7 rounded-full bg-blue-800 text-white flex items-center justify-center shadow-lg hover:bg-blue-900 transition-colors"
              title="Agregar nodo conectado"
            >
              <Plus className="w-4 h-4" />
            </button>
            {quickAddOpen && (
              <QuickAddPopup
                onSelect={type => {
                  addNodeBelow(quickAddState.nodeId, type)
                  setQuickAddOpen(false)
                  setQuickAddState(null)
                }}
                hasStart={nodes.some(n => n.type === 'start')}
              />
            )}
          </div>
        )}
      </div>

      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onChange={onNodeDataChange}
          onClose={() => setSelectedNode(null)}
          onDeleteOptionEdge={onDeleteOptionEdge}
          onDeleteNode={onDeleteNode}
        />
      )}

      {showTemplates && (
        <TemplateModal
          onSelect={template => {
            setNodes(template.nodes)
            setEdges(template.edges)
            idCounterRef.current = template.nodes.reduce((max, n) => {
              const num = parseInt(n.id.split('-').pop(), 10)
              return isNaN(num) ? max : Math.max(max, num)
            }, 1)
            setSelectedNode(null)
            setShowTemplates(false)
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  )
}
