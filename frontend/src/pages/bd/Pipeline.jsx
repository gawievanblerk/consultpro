import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

function Pipeline() {
  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">Visual overview of opportunities</p>
      </div>

      <div className="flex space-x-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = getLeadsForStage(stage.id);
          const stageValue = stageLeads.reduce((sum, lead) => sum + (parseFloat(lead.estimated_value) || 0), 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className="bg-gray-100 rounded-t-lg p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                  <span className="text-sm text-gray-500">{stageLeads.length}</span>
                </div>
                <p className="text-sm text-accent-600 font-medium mt-1">
                  {formatCurrency(stageValue)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-b-lg p-2 min-h-[400px] space-y-2">
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <p className="font-medium text-gray-900 text-sm">{lead.company_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{lead.contact_name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-medium text-primary-900">
                        {formatCurrency(lead.estimated_value)}
                      </span>
                      <span className="text-xs text-gray-400">{lead.probability}%</span>
                    </div>
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">No leads</p>
                )}
              </div>
            </div>
          );
        })}
        {stages.length === 0 && (
          <div className="text-center py-12 text-gray-500 w-full">
            No pipeline stages configured
          </div>
        )}
      </div>
    </div>
  );
}

export default Pipeline;
