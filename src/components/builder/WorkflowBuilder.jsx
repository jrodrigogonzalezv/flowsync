import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow, addEdge, useNodesState, useEdgesState,
  Controls, Background, BackgroundVariant, MiniMap,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import NodeSidebar from './NodeSidebar'
import NodeConfigPanel from './NodeConfigPanel'
import FlowNode from './nodes/FlowNode'
import { Save, Loader2 } from 'lucide-react'

const nodeTypes = { start: FlowNode, form: FlowNode, ai: FlowNode, condition: FlowNode, notification: FlowNode, end: FlowNode }

const initialNodes = [
  { id: 'start-1', type: 'start', position: { x: 300, y: 80 }, data: { label: 'Inicio' } },
]

let idCounter = 1

export default function WorkflowBuilder({ workflow, onSave, saving }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes || initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || [])
  const [selectedNode, setSelectedNode] = useState(null)
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
  }

  function onNodeClick(_, node) { setSelectedNode(node) }
  function onPaneClick() { setSelectedNode(null) }

  function onNodeDataChange(nodeId, newData) {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: newData } : n))
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data: newData } : prev)
  }

  return (
    <div className="flex h-full">
      <NodeSidebar />

      <div className="flex-1 relative" ref={reactFlowWrapper}>
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
          <MiniMap
            nodeColor={n => {
              const colors = { start: '#10b981', form: '#1e40af', ai: '#7c3aed', condition: '#d97706', notification: '#ea580c', end: '#dc2626' }
              return colors[n.type] || '#94a3b8'
            }}
            className="!border-slate-200 !shadow-sm"
          />
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeConfigPanel node={selectedNode} onChange={onNodeDataChange} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  )
}
