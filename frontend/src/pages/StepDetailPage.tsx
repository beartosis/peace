import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRun, useStepDetail } from '../api/hooks'
import Breadcrumb from '../components/Breadcrumb'
import StepDetailHeader from '../components/StepDetailHeader'
import StateFlowPipeline from '../components/StateFlowPipeline'
import StateNodeDetail from '../components/StateNodeDetail'
import HandoffViewer from '../components/HandoffViewer'

export default function StepDetailPage() {
  const { runId, stepNumber } = useParams<{ runId: string; stepNumber: string }>()
  const sn = Number(stepNumber)
  const rid = Number(runId)
  const { data: step, isLoading, error } = useStepDetail(isNaN(rid) ? 0 : rid, isNaN(sn) ? 0 : sn)
  const { data: run } = useRun(isNaN(rid) ? 0 : rid)
  const [activeState, setActiveState] = useState<string | null>(null)

  if (isNaN(sn) || isNaN(rid)) {
    return <p className="text-red-600">Invalid step or run ID.</p>
  }

  if (isLoading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading step...</p>
  }

  if (error || !step) {
    return <p className="text-red-600">Failed to load step.</p>
  }

  const breadcrumbItems = [
    { label: 'Dashboard', to: '/' },
    { label: run ? `${run.project ?? 'Run'} #${run.id}` : `Run #${rid}`, to: `/runs/${rid}` },
    { label: `Step ${step.step_number}${step.title ? `: ${step.title}` : ''}` },
  ]

  function handleNodeClick(state: string) {
    setActiveState(prev => prev === state ? null : state)
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      <StepDetailHeader step={step} />
      <StateFlowPipeline
        transitions={step.transitions}
        arbiterEvents={step.arbiter_events}
        onNodeClick={handleNodeClick}
        activeState={activeState}
      />
      {activeState && (
        <StateNodeDetail
          state={activeState}
          transitions={step.transitions}
          arbiterEvents={step.arbiter_events}
        />
      )}
      <HandoffViewer runId={rid} stepNumber={step.step_number} />
    </div>
  )
}
