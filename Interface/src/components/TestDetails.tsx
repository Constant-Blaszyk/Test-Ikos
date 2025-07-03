import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getTestResults, downloadReport } from '../services/api';
import { Test, TestStep } from '../types';
import { toast } from 'react-toastify';

const TestDetails: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchTestData = async () => {
    if (!testId) return;
    
    try {
      setLoading(true);
      const data = await getTestResults(testId);
      setTest(data);
      setError(null);
    } catch (err) {
      setError('Failed to load test results');
      console.error('Error fetching test results:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTestData();
    
    // If test is running, poll for updates every 2 seconds
    let intervalId: NodeJS.Timeout;
    
    if (test?.status === 'running') {
      intervalId = setInterval(fetchTestData, 2000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [testId, test?.status]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTestData();
    setRefreshing(false);
  };
  
  const handleDownloadReport = async () => {
    if (!test?.pdf_id) {
      toast.error('No report available for download');
      return;
    }
    
    try {
      await downloadReport(test.pdf_id);
      toast.success('Report downloaded successfully');
    } catch (err) {
      toast.error('Failed to download report');
      console.error('Error downloading report:', err);
    }
  };
  
  const toggleStepExpansion = (index: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };
  
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'succès':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'échec':
      case 'failed':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };
  
  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'succès':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'échec':
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };
  
  if (loading && !test) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600">Loading test details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <p className="font-medium">Error</p>
        <p>{error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-2 text-red-700 hover:text-red-800 font-medium flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Test Details
          </h1>
          <div className={`ml-2 text-xs font-medium px-2 py-1 rounded-full ${getStatusClass(test?.status || '')}`}>
            {test?.status?.charAt(0).toUpperCase() + test?.status?.slice(1) || 'Unknown'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {test?.pdf_id && (
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Test Information</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Test ID</p>
              <p className="mt-1 text-sm text-gray-900">{test?.test_id || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                {getStatusIcon(test?.status || '')}
                {test?.status?.charAt(0).toUpperCase() + test?.status?.slice(1) || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Date Created</p>
              <p className="mt-1 text-sm text-gray-900">
                {test?.date_creation ? new Date(test.date_creation).toLocaleString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Execution Time</p>
              <p className="mt-1 text-sm text-gray-900">
                {test?.execution_time ? `${test.execution_time.toFixed(2)} seconds` : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Test Steps</h2>
        </div>
        {test?.steps && test.steps.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {test.steps.map((step: TestStep, index: number) => (
              <div key={index} className="px-6 py-4">
                <div 
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => toggleStepExpansion(index)}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(step.status)}
                    <span className="font-medium text-gray-900">
                      {step.description || `Step ${index + 1}`}
                    </span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    {expandedSteps[index] ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>
                
                {expandedSteps[index] && (
                  <div className="mt-3 pl-8 text-sm text-gray-600 border-l-2 border-gray-200">
                    <p className="mb-1">
                      <span className="font-medium text-gray-700">Status:</span>{' '}
                      <span className={step.status?.toLowerCase() === 'succès' ? 'text-green-600' : 'text-red-600'}>
                        {step.status}
                      </span>
                    </p>
                    {step.result && (
                      <p className="whitespace-pre-wrap">
                        <span className="font-medium text-gray-700">Result:</span>{' '}
                        {step.result}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            {test?.status === 'running' ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                <p>Test is running. Steps will appear here as they complete.</p>
              </div>
            ) : (
              <p>No steps available for this test.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestDetails;