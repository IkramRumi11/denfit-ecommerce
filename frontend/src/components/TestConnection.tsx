// src/components/TestConnection.tsx
import React, { useState } from 'react';
import { api } from '../api';

const TestConnection: React.FC = () => {
  const [status, setStatus] = useState<string>('Click to test');
  const [data, setData] = useState<any>(null);

  const testConnection = async () => {
    setStatus('Testing...');
    try {
      const result = await api.healthCheck();
      setData(result);
      setStatus('✅ Connected successfully!');
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Backend Connection Test</h3>
      <button onClick={testConnection}>Test Connection</button>
      <p>{status}</p>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};

export default TestConnection;