import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import DraggableLeadCard from './DraggableLeadCard';

function DroppableStage({ stage, leads, formatCurrency }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stage }
  });

  const stageValue = leads.reduce((sum, lead) => sum + (parseFloat(lead.estimated_value) || 0), 0);

  return (
    <div className="flex-shrink-0 w-72">
      <div className="bg-gray-100 rounded-t-lg p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{stage.name}</h3>
          <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        <p className="text-sm text-accent-600 font-medium mt-1">
          {formatCurrency(stageValue)}
        </p>
      </div>
      <div
        ref={setNodeRef}
        className={`bg-gray-50 rounded-b-lg p-2 min-h-[400px] space-y-2 transition-all ${
          isOver ? 'bg-accent-50 ring-2 ring-accent-500 ring-inset' : ''
        }`}
      >
        {leads.map((lead) => (
          <DraggableLeadCard
            key={lead.id}
            lead={lead}
            formatCurrency={formatCurrency}
          />
        ))}
        {leads.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            Drop leads here
          </p>
        )}
      </div>
    </div>
  );
}

export default DroppableStage;
