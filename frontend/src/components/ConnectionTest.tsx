// src/components/ConnectionTest.tsx
import React, { useState } from 'react';
import { api } from '../api';

const ConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [testData, setTestData] = useState<any>(null);

  const testConnection = async () => {
    setStatus('testing');
    setMessage('Testing backend connection...');
    setTestData(null);

    try {
      // Test health endpoint
      const healthResponse = await api.healthCheck();
      setTestData(healthResponse);
      setStatus('success');
      setMessage('✅ Backend connected successfully!');
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAuth = async () => {
    setStatus('testing');
    setMessage('Testing authentication...');

    try {
      // Try to get current user profile
      const userResponse = await api.auth.getMe();
      setTestData(userResponse);
      setStatus('success');
      setMessage('✅ Authentication working! User profile loaded.');
    } catch (error) {
      setStatus('error');
      setMessage('⚠️ Authentication test failed (this is normal if not logged in)');
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      margin: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>🔗 DENFiT Backend Connection Test</h2>
      
      <div style={{ 
        padding: '10px', 
        borderRadius: '4px', 
        margin: '10px 0',
        backgroundColor: 
          status === 'success' ? '#d4edda' : 
          status === 'error' ? '#f8d7da' : 
          status === 'testing' ? '#fff3cd' : '#f8f9fa',
        color: 
          status === 'success' ? '#155724' : 
          status === 'error' ? '#721c24' : 
          status === 'testing' ? '#856404' : '#666',
        fontWeight: 'bold'
      }}>
        {message || 'Click a button to test connection'}
      </div>

      <div style={{ gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={testConnection}
          disabled={status === 'testing'}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status === 'testing' ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {status === 'testing' ? 'Testing...' : 'Test Connection'}
        </button>

        <button 
          onClick={testAuth}
          disabled={status === 'testing'}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status === 'testing' ? 'not-allowed' : 'pointer'
          }}
        >
          Test Auth
        </button>
      </div>

      {testData && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          overflowX: 'auto'
        }}>
          <h4>Response Data:</h4>
          <pre>{JSON.stringify(testData, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Frontend:</strong> http://localhost:3000</p>
        <p><strong>Backend:</strong> http://localhost:5000</p>
        <p><strong>API Proxy:</strong> /api → http://localhost:5000/api/v1</p>
      </div>
    </div>
  );
};

export default ConnectionTest;