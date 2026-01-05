import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  TrophyIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  CheckBadgeIcon,
  CalendarIcon,
  AcademicCapIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

function MyCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/certificates/my');
      setCertificates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      showError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certId) => {
    try {
      const response = await api.get(`/certificates/${certId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${certId}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      showError('Failed to download certificate');
    }
  };

  const handleShare = (cert) => {
    setSelectedCert(cert);
    setShowShareModal(true);
    setCopied(false);
  };

  const copyVerificationLink = () => {
    const link = `${window.location.origin}/verify/${selectedCert.verification_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    showSuccess('Verification link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getExpiryStatus = (expiresAt) => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Expired', color: 'red' };
    }
    if (daysUntilExpiry <= 30) {
      return { status: 'expiring', label: `Expires in ${daysUntilExpiry} days`, color: 'yellow' };
    }
    return { status: 'valid', label: `Valid until ${expiry.toLocaleDateString()}`, color: 'green' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">My Certificates</h1>
          <p className="text-sm text-primary-500 mt-1">
            View and download your earned certificates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent-100 text-accent-700 rounded-lg">
            <TrophyIcon className="w-5 h-5" />
            <span className="font-semibold">{certificates.length}</span>
            <span>certificates earned</span>
          </span>
        </div>
      </div>

      {/* Certificates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-primary-100">
          <TrophyIcon className="mx-auto h-12 w-12 text-primary-300" />
          <h3 className="mt-2 text-sm font-medium text-primary-900">No certificates yet</h3>
          <p className="mt-1 text-sm text-primary-500">
            Complete training modules to earn certificates.
          </p>
          <a
            href="/dashboard/my-training"
            className="inline-flex items-center gap-2 mt-4 text-accent-600 hover:text-accent-700"
          >
            <AcademicCapIcon className="w-4 h-4" />
            View My Training
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map(cert => {
            const expiryInfo = getExpiryStatus(cert.expires_at);

            return (
              <div
                key={cert.id}
                className="bg-white rounded-xl shadow-sm border border-primary-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Certificate Preview */}
                <div className="bg-gradient-to-br from-accent-50 to-primary-50 p-6 text-center border-b border-primary-100">
                  <div className="w-16 h-16 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                    <TrophyIcon className="w-8 h-8 text-accent-600" />
                  </div>
                  <h3 className="font-bold text-primary-900 text-lg line-clamp-2">
                    {cert.module_title}
                  </h3>
                  {cert.score !== null && (
                    <p className="text-sm text-primary-600 mt-1">
                      Score: <span className="font-semibold text-accent-600">{cert.score}%</span>
                    </p>
                  )}
                </div>

                {/* Certificate Details */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-primary-600">
                    <CalendarIcon className="w-4 h-4 text-primary-400" />
                    <span>Issued: {new Date(cert.issued_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-primary-600">
                    <CheckBadgeIcon className="w-4 h-4 text-primary-400" />
                    <span>Code: <code className="bg-primary-100 px-1 rounded">{cert.verification_code}</code></span>
                  </div>

                  {expiryInfo && (
                    <div className={`flex items-center gap-2 text-sm ${
                      expiryInfo.color === 'red' ? 'text-red-600' :
                      expiryInfo.color === 'yellow' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        expiryInfo.color === 'red' ? 'bg-red-500' :
                        expiryInfo.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`} />
                      <span>{expiryInfo.label}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex border-t border-primary-100">
                  <button
                    onClick={() => handleDownload(cert.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Download
                  </button>
                  <div className="w-px bg-primary-100" />
                  <button
                    onClick={() => handleShare(cert)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors"
                  >
                    <ShareIcon className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-primary-900 mb-2">
                Share Certificate
              </h2>
              <p className="text-sm text-primary-600 mb-4">
                Share this verification link with employers or others to verify your certificate.
              </p>

              <div className="bg-primary-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-primary-700 mb-2">
                  {selectedCert.module_title}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/verify/${selectedCert.verification_code}`}
                    className="flex-1 text-xs bg-white border border-primary-200 rounded px-2 py-1.5"
                  />
                  <button
                    onClick={copyVerificationLink}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-accent-600 rounded hover:bg-accent-700 transition-colors"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <CheckBadgeIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Verification Code</p>
                    <p className="text-lg font-mono font-bold text-green-600">
                      {selectedCert.verification_code}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Anyone with this code can verify your certificate's authenticity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setSelectedCert(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyCertificates;
