import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileJson, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { uploadDistributionJSON } from '../lib/api';

function UploadPage() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragging(true);
    } else if (e.type === 'dragleave') {
      setDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.type !== 'application/json') {
      setError('Please upload a JSON file');
      return;
    }
    setFile(file);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadDistributionJSON(file);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Distribution JSON</h1>
        <p className="mt-2 text-gray-600">
          Upload a JSON file containing LoopDrops and Loyalty Rewards to create distributions.
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">
            Drop your JSON file here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Accepts distribution JSON files only
          </p>
        </div>

        <input
          type="file"
          accept=".json"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors"
        >
          <FileJson className="w-5 h-5" />
          Select File
        </label>

        {file && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg inline-block">
            <div className="flex items-center gap-3">
              <FileJson className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-gray-900">{file.name}</span>
              <span className="text-sm text-gray-500">
                ({(file.size / 1024).toFixed(2)} KB)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {file && !result && (
        <div className="flex justify-center">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload & Process
              </>
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Upload Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Upload Successful</p>
              <p className="text-sm text-green-700 mt-1">
                Processed {result.results.loopDrops} LoopDrops and{' '}
                {result.results.loyaltyRewards} Loyalty Rewards
              </p>
            </div>
          </div>

          {result.results.errors && result.results.errors.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-medium text-yellow-900 mb-2">Warnings:</p>
              <ul className="text-sm text-yellow-700 space-y-1">
                {result.results.errors.map((err, i) => (
                  <li key={i}>
                    {err.type}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/operator')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              View Distributions
            </button>
            <button
              onClick={() => {
                setFile(null);
                setResult(null);
                setError(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Upload Another
            </button>
          </div>
        </div>
      )}

      {/* Sample JSON */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample JSON Format</h3>
        <pre className="text-xs text-gray-700 overflow-x-auto bg-white p-4 rounded border border-gray-200">
{`{
  "loopDrops": [{
    "distribution": {
      "name": "Drop 1",
      "description": "One-time distribution",
      "schedule": "2025-01-01T00:00:00Z",
      "token": "0x...",
      "amount": 1000000000000000000,
      "recipients": [
        { "address": "0x...", "amount": 500000000000000000 },
        { "address": "0x...", "amount": 500000000000000000 }
      ],
      "approvers": ["0x...", "0x..."]
    }
  }],
  "loyaltyRewards": [{
    "distribution": {
      "description": "Weekly rewards",
      "frequency": "weekly",
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "token": "0x...",
      "amount": 1000000000000000000,
      "recipients": [
        { "address": "0x...", "amount": 500000000000000000 }
      ],
      "approvers": ["0x..."]
    }
  }]
}`}
        </pre>
      </div>
    </div>
  );
}

export default UploadPage;
