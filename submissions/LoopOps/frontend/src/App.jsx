import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Package, CheckCircle, Upload } from 'lucide-react';
import OperatorDashboard from './pages/OperatorDashboard';
import DistributionDetail from './pages/DistributionDetail';
import ApproverDashboard from './pages/ApproverDashboard';
import UploadPage from './pages/UploadPage';

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">LoopOps</h1>
              <span className="text-sm text-gray-500 hidden sm:inline">
                HyperEVM Distribution Engine
              </span>
            </div>
            
            <nav className="flex gap-4">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload</span>
                </div>
              </Link>
              <Link
                to="/operator"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  location.pathname.startsWith('/operator')
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Operator</span>
                </div>
              </Link>
              <Link
                to="/approver"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  location.pathname === '/approver'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Approver</span>
                </div>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/operator" element={<OperatorDashboard />} />
          <Route path="/operator/distribution/:id" element={<DistributionDetail />} />
          <Route path="/approver" element={<ApproverDashboard />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>LoopOps - Automated Distribution Engine for HyperEVM</p>
            <p className="mt-1">Built for Looping Collective</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
