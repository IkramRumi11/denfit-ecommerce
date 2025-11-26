// src/components/APITester.tsx
import React, { useState } from 'react';
import { api } from '../api';

const APITester: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string>('');

  const testEndpoint = async (endpoint: string, testFn: () => Promise<any>) => {
    setLoading(endpoint);
    try {
      const result = await testFn();
      setResults((prev: any) => ({
        ...prev,
        [endpoint]: { success: true, data: result }
      }));
    } catch (error) {
      setResults((prev: any) => ({
        ...prev,
        [endpoint]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }));
    } finally {
      setLoading('');
    }
  };

  const runAllTests = async () => {
    await testEndpoint('Health Check', () => api.healthCheck());
    await testEndpoint('Products', () => api.products.getAll());
    await testEndpoint('Product by ID', () => api.products.getById('1'));
  };

  return (
    <div style={{ 
      padding: '20px', 
      margin: '20px', 
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#f7fafc'
    }}>
      <h2>🔧 API Connection Tester</h2>
      
      <button 
        onClick={runAllTests}
        disabled={!!loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4299e1',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Testing...' : 'Run All Tests'}
      </button>

      <div style={{ display: 'grid', gap: '15px' }}>
        {Object.entries(results).map(([endpoint, result]: [string, any]) => (
          <div 
            key={endpoint}
            style={{
              padding: '15px',
              border: '1px solid',
              borderColor: result.success ? '#c6f6d5' : '#fed7d7',
              backgroundColor: result.success ? '#f0fff4' : '#fff5f5',
              borderRadius: '4px'
            }}
          >
            <h4 style={{ 
              color: result.success ? '#276749' : '#c53030',
              margin: '0 0 10px 0'
            }}>
              {result.success ? '✅' : '❌'} {endpoint}
            </h4>
            {result.success ? (
              <pre style={{ 
                fontSize: '12px', 
                margin: 0,
                backgroundColor: '#edf2f7',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto'
              }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            ) : (
              <div style={{ color: '#c53030' }}>
                Error: {result.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {Object.keys(results).length === 0 && !loading && (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          color: '#718096'
        }}>
          Click "Run All Tests" to check API connectivity
        </div>
      )}
    </div>
  );
};

export default APITester;