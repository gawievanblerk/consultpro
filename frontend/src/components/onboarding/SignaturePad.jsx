import { useRef, useState, useEffect } from 'react';
import { processSignatureImage, previewSignatureImage } from '../../utils/signatureProcessor';

export default function SignaturePad({ onSave, onCancel, disabled = false }) {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' or 'upload'
  const [uploadedImage, setUploadedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    if (activeTab !== 'draw') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // Higher resolution
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Set drawing style
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill white background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [activeTab]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (disabled) return;

    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;

    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);
    setHasSignature(false);
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setProcessedImage(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a PNG or JPG image.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB.');
      return;
    }

    setUploadError(null);
    setIsProcessing(true);

    try {
      // Show preview first
      const preview = await previewSignatureImage(file);
      setUploadedImage(preview);

      // Process for final signature
      const processed = await processSignatureImage(file);
      setProcessedImage(processed);
    } catch (err) {
      setUploadError(err.message || 'Failed to process image.');
      setUploadedImage(null);
      setProcessedImage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Create a fake event to reuse handleFileChange
      const fakeEvent = { target: { files: [file] } };
      handleFileChange(fakeEvent);
    }
  };

  const handleSave = () => {
    if (activeTab === 'draw') {
      if (!hasSignature) {
        alert('Please provide your signature before saving');
        return;
      }
      const canvas = canvasRef.current;
      const signatureData = canvas.toDataURL('image/png');
      onSave(signatureData, 'canvas');
    } else {
      if (!processedImage) {
        alert('Please upload a signature image first');
        return;
      }
      onSave(processedImage, 'upload');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Clear state when switching tabs
    if (tab === 'draw') {
      clearUpload();
    } else {
      setHasSignature(false);
    }
  };

  const canSubmit = activeTab === 'draw' ? hasSignature : !!processedImage;

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => handleTabChange('draw')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'draw'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Draw Signature
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('upload')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'upload'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Upload Signature
        </button>
      </div>

      {/* Draw Tab */}
      {activeTab === 'draw' && (
        <>
          <div className="text-sm text-gray-600 mb-2">
            Draw your signature in the box below:
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <canvas
              ref={canvasRef}
              className="w-full cursor-crosshair touch-none"
              style={{ height: '200px' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          <div className="text-xs text-gray-400 text-center">
            Use your mouse or finger to sign above
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={clearCanvas}
              disabled={disabled}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <>
          <div className="text-sm text-gray-600 mb-2">
            Upload an image of your signature:
          </div>

          {!uploadedImage && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-gray-100 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Click to upload or drag and drop
              </p>
              <p className="mt-1 text-xs text-gray-500">
                PNG or JPG up to 5MB
              </p>
            </div>
          )}

          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {uploadError}
            </div>
          )}

          {isProcessing && (
            <div className="border-2 border-gray-200 rounded-lg bg-white p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Processing signature...</p>
            </div>
          )}

          {processedImage && !isProcessing && (
            <div className="space-y-3">
              <div className="border-2 border-gray-200 rounded-lg bg-white p-4">
                <p className="text-xs text-gray-500 mb-2">Processed Signature:</p>
                <div className="flex justify-center">
                  <img
                    src={processedImage}
                    alt="Processed signature"
                    className="max-h-32 border border-gray-100 rounded"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={clearUpload}
                  disabled={disabled}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Upload Different Image
                </button>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 text-center">
            For best results, use a clear image with good contrast on a white background
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-2 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || !canSubmit || isProcessing}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? 'Saving...' : 'Sign & Submit'}
        </button>
      </div>

      <div className="text-xs text-gray-500 border-t pt-3 mt-3">
        By clicking "Sign & Submit", I acknowledge that this electronic signature has the same legal effect as a handwritten signature.
      </div>
    </div>
  );
}