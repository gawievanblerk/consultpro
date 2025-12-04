import React from 'react';
import { useDraggable } from '@dnd-kit/core';

function DraggableLeadCard({ lead, formatCurrency }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: lead.id,
    data: { lead }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''
      }`}
    >
      <p className="font-medium text-gray-900 text-sm">{lead.company_name}</p>
      {lead.contact_name && (
        <p className="text-xs text-gray-500 mt-1">{lead.contact_name}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-medium text-primary-900">
          {formatCurrency(lead.estimated_value)}
        </span>
        <span className="text-xs text-gray-400">{lead.probability}%</span>
      </div>
    </div>
  );
}

export default DraggableLeadCard;
