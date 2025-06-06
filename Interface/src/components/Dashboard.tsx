import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTestContext } from '../context/TestContext';
import { getTestHistory, startNewTest } from '../services/api';
import { Test } from '../types';
import { toast } from 'react-toastify';
import axios from 'axios';

const Dashboard: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { testHistory, setTestHistory } = useTestContext();
  const [loading, setLoading] = useState(true);
  const [startingTest, setStartingTest] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:3001/api/modules/${moduleId}/scenarios`
        );
        
        if (response.data && Array.isArray(response.data)) {
          setTestHistory(response.data);
          setError('');
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching module data:', err);
        setError('Failed to fetch module data');
      } finally {
        setLoading(false);
      }
    };

    if (moduleId) {
      fetchModuleData();
    }
  }, [moduleId, setTestHistory]);
  
  const handleStartTest = async () => {
    try {
      setStartingTest(true);
      const testId = `test_${moduleId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Start the test with the selected module
      await startNewTest(testId, moduleId);
      toast.success('Test started successfully');
      
      // Optimistically add new test to the list
      const newTest: Test = {
        test_id: testId,
        status: 'running',
        date_creation: new Date().toISOString(),
        steps: []
      };
      
      setTestHistory([newTest, ...testHistory]);
      
      // Navigate to the test details page
      window.location.href = `/test/${testId}`;
    } catch (error) {
      console.error('Failed to start test:', error);
      toast.error('Failed to start test');
    } finally {
      setStartingTest(false);
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Dashboard</h1>
          <p className="text-gray-600">Monitor and manage automated tests</p>
        </div>
        <button
          onClick={handleStartTest}
          disabled={startingTest}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {startingTest ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {startingTest ? 'Starting Test...' : 'Start New Test'}
        </button>
      </div>
      
      {loading && testHistory.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testHistory.length > 0 ? (
            testHistory.map((test) => (
              <Link
                key={test.test_id}
                to={`/test/${test.test_id}`}
                className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusClass(test.status)}`}>
                      {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(test.date_creation)}</span>
                </div>
                <div className="mb-2">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    Test #{test.test_id.split('_')[1]?.substring(0, 6) || test.test_id}
                  </h3>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {test.steps?.length || 0} steps
                  </div>
                  <span className="text-xs text-blue-600 font-medium group-hover:underline">View Details</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-gray-500">No tests found. Start a new test to see results here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;