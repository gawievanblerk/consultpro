import React from 'react';
import Modal from './Modal';

function StageChangeModal({
  isOpen,
  onClose,
  onConfirm,
  lead,
  newStageName,
  moveData,
  setMoveData,
  saving
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  if (!lead) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Move Lead to ${newStageName}`}
      size="md"
    >
      <div className="space-y-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="font-medium text-gray-900">{lead.company_name}</p>
          {lead.contact_name && (
            <p className="text-sm text-gray-500">{lead.contact_name}</p>
          )}
          <p className="text-sm text-primary-700 mt-1">
            Current Value: {formatCurrency(lead.estimated_value)}
          </p>
        </div>

        <div>
          <label className="form-label">Notes</label>
          <textarea
            value={moveData.notes}
            onChange={(e) => setMoveData({ ...moveData, notes: e.target.value })}
            className="form-input"
            rows={3}
            placeholder="Add notes about this stage change..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Probability (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={moveData.probability}
              onChange={(e) => setMoveData({ ...moveData, probability: parseInt(e.target.value) || 0 })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Expected Close Date</label>
            <input
              type="date"
              value={moveData.expected_close_date}
              onChange={(e) => setMoveData({ ...moveData, expected_close_date: e.target.value })}
              className="form-input"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Estimated Value (NGN)</label>
          <input
            type="number"
            min="0"
            value={moveData.estimated_value}
            onChange={(e) => setMoveData({ ...moveData, estimated_value: parseFloat(e.target.value) || 0 })}
            className="form-input"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Moving...' : 'Confirm Move'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default StageChangeModal;
