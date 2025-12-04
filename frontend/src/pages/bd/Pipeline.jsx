import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import api from '../../utils/api';
import DroppableStage from '../../components/DroppableStage';
import DraggableLeadCard from '../../components/DraggableLeadCard';
import StageChangeModal from '../../components/StageChangeModal';

function Pipeline() {
  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drag-and-drop state
  const [activeLead, setActiveLead] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [moveData, setMoveData] = useState({
    notes: '',
    probability: 0,
    expected_close_date: '',
    estimated_value: 0
  });
  const [saving, setSaving] = useState(false);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activating
      },
    })
  );

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      const [stagesRes, leadsRes] = await Promise.all([
        api.get('/api/pipeline/stages'),
        api.get('/api/leads')
      ]);
      if (stagesRes.data.success) setStages(stagesRes.data.data);
      if (leadsRes.data.success) setLeads(leadsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getLeadsForStage = (stageId) => {
    return leads.filter(lead => lead.pipeline_stage_id === stageId);
  };

  // Drag event handlers
  const handleDragStart = (event) => {
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
    setActiveLead(lead);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id;
    const newStageId = over.id;
    const lead = leads.find(l => l.id === leadId);

    // Don't open modal if dropped on same stage
    if (lead.pipeline_stage_id === newStageId) return;

    // Get target stage for probability default
    const targetStage = stages.find(s => s.id === newStageId);

    // Store pending move and open modal with pre-filled data
    setPendingMove({ leadId, newStageId, lead });
    setMoveData({
      notes: lead.notes || '',
      probability: targetStage?.probability || lead.probability || 0,
      expected_close_date: lead.expected_close_date?.split('T')[0] || '',
      estimated_value: lead.estimated_value || 0
    });
    setModalOpen(true);
  };

  const handleDragCancel = () => {
    setActiveLead(null);
  };

  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    setSaving(true);

    const { leadId, newStageId } = pendingMove;

    // Optimistic update
    const previousLeads = [...leads];
    setLeads(prev => prev.map(l =>
      l.id === leadId
        ? {
            ...l,
            pipeline_stage_id: newStageId,
            notes: moveData.notes,
            probability: moveData.probability,
            expected_close_date: moveData.expected_close_date,
            estimated_value: moveData.estimated_value
          }
        : l
    ));

    try {
      await api.put(`/api/leads/${leadId}`, {
        pipeline_stage_id: newStageId,
        notes: moveData.notes,
        probability: moveData.probability,
        expected_close_date: moveData.expected_close_date || null,
        estimated_value: moveData.estimated_value
      });
      setModalOpen(false);
      setPendingMove(null);
    } catch (error) {
      // Rollback on error
      console.error('Failed to move lead:', error);
      setLeads(previousLeads);
      alert('Failed to move lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelMove = () => {
    setModalOpen(false);
    setPendingMove(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
      </div>
    );
  }

  const newStageName = pendingMove
    ? stages.find(s => s.id === pendingMove.newStageId)?.name || 'New Stage'
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">Drag leads between stages to update their status</p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <DroppableStage
              key={stage.id}
              stage={stage}
              leads={getLeadsForStage(stage.id)}
              formatCurrency={formatCurrency}
            />
          ))}
          {stages.length === 0 && (
            <div className="text-center py-12 text-gray-500 w-full">
              No pipeline stages configured
            </div>
          )}
        </div>

        {/* Drag overlay for visual feedback */}
        <DragOverlay>
          {activeLead ? (
            <div className="bg-white p-3 rounded-lg shadow-lg border-2 border-primary-500 w-72 opacity-90">
              <p className="font-medium text-gray-900 text-sm">{activeLead.company_name}</p>
              {activeLead.contact_name && (
                <p className="text-xs text-gray-500 mt-1">{activeLead.contact_name}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-medium text-primary-900">
                  {formatCurrency(activeLead.estimated_value)}
                </span>
                <span className="text-xs text-gray-400">{activeLead.probability}%</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Stage change confirmation modal */}
      <StageChangeModal
        isOpen={modalOpen}
        onClose={handleCancelMove}
        onConfirm={handleConfirmMove}
        lead={pendingMove?.lead}
        newStageName={newStageName}
        moveData={moveData}
        setMoveData={setMoveData}
        saving={saving}
      />
    </div>
  );
}

export default Pipeline;
