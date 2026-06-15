import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow, addEdge, useNodesState, useEdgesState,
  Controls, Background, BackgroundVariant, MiniMap,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import NodeSidebar from './NodeSidebar'
import NodeConfigPanel from './NodeConfigPanel'
import FlowNode from './nodes/FlowNode'
import { Save, Loader2, Layers, X } from 'lucide-react'

const nodeTypes = { start: FlowNode, form: FlowNode, ai: FlowNode, condition: FlowNode, notification: FlowNode, end: FlowNode }

const initialNodes = [
  { id: 'start-1', type: 'start', position: { x: 300, y: 80 }, data: { label: 'Inicio' } },
]

let idCounter = 1

export default function WorkflowBuilder({ workflow, onSave, saving }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes || initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || [])
  const [selectedNode, setSelectedNode] = useState(null)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const reactFlowWrapper = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  const onConnect = useCallback(
    params => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#1e40af', strokeWidth: 2 } }, eds)),
    [setEdges]
  )

  function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  function onDrop(e) {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    if (!type || !reactFlowInstance) return
    const bounds = reactFlowWrapper.current.getBoundingClientRect()
    const position = reactFlowInstance.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top })
    setNodes(nds => [...nds, { id: `${type}-${++idCounter}`, type, position, data: { label: '', description: '', fields: [] } }])
    setShowMobileSidebar(false)
  }

  function onNodeClick(_, node) { setSelectedNode(node); setShowMobileSidebar(false) }
  function onPaneClick() { setSelectedNode(null) }

  function onNodeDataChange(nodeId, newData) {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: newData } : n))
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data: newData } : prev)
  }

  return (
    <div className="flex h-full relative">

      {/* NodeSidebar: hidden on mobile by default, overlay when toggled, always visible on md+ */}
      <div className={showMobileSidebar ? 'flex absolute inset-y-0 left-0 z-30 shadow-xl' : 'hidden md:flex'}>
        <NodeSidebar onClose={() => setShowMobileSidebar(false)} showClose={showMobileSidebar} />
      </div>

      {/* Mobile backdrop for sidebar */}
      {showMobileSidebar && (
        <div
          className="md:hidden absolute inset-0 bg-black/30 z-20"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      <div className="flex-1 relative min-w-0" ref={reactFlowWrapper}>

        {/* Controls row: top-left mobile toggle, top-right save */}
        <div className="absolute top-4 left-4 z-10 md:hidden">
          <button
            onClick={() => setShowMobileSidebar(s => !s)}
            className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
          >
            <Layers className="w-4 h-4 text-blue-800" />
            Nodos
          </button>
        </div>

        <div className="absolute top-4 right-4 z-10">
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
          nodeTypes={nodeTypes} fitView
          defaultEdgeOptions={{ animated: true, style: { stroke: '#1e40af', strokeWidth: 2 } }}
        >
          <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={20} size={1} />
          <Controls className="!border-slate-200 !shadow-sm" />
          {window.innerWidth >= 640 && (
            <MiniMap
              nodeColor={n => {
                const colors = { start: '#10b981', form: '#1e40af', ai: '#7c3aed', condition: '#d97706', notification: '#ea580c', end: '#dc2626' }
                return colors[n.type] || '#94a3b8'
              }}
              className="!border-slate-200 !shadow-sm"
            />
          )}
        </ReactFlow>
      </div>

      {/* NodeConfigPanel: static on md+, absolute overlay on mobile */}
      {selectedNode && (
        <>
          <div className="md:hidden absolute inset-0 bg-black/20 z-20" onClick={() => setSelectedNode(null)} />
          <div className="absolute inset-y-0 right-0 z-30 md:static md:z-auto shadow-xl md:shadow-sm">
            <NodeConfigPanel node={selectedNode} onChange={onNodeDataChange} onClose={() => setSelectedNode(null)} />
          </div>
        </>
      )}
    </div>
  )
}
