import { useState, useEffect, useRef } from 'react';

function LiveOutput({ scriptId, onClose }) {
  const [output, setOutput] = useState([]);
  const [status, setStatus] = useState('connecting');
  const [runId, setRunId] = useState(null);
  const [exitCode, setExitCode] = useState(null);
  const outputEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    // Create EventSource for SSE
    const eventSource = new EventSource(`/api/scripts/${scriptId}/test`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus('running');
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'connected':
          setStatus('running');
          break;

        case 'output':
          setOutput(prev => [...prev, { stream: data.stream, content: data.content }]);
          break;

        case 'complete':
          setStatus('completed');
          setRunId(data.runId);
          setExitCode(data.exitCode);
          eventSource.close();
          break;

        case 'error':
          setStatus('error');
          setOutput(prev => [...prev, { stream: 'stderr', content: `Error: ${data.message}\n` }]);
          eventSource.close();
          break;
      }
    };

    eventSource.onerror = () => {
      setStatus('error');
      eventSource.close();
    };

    // Cleanup
    return () => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        eventSource.close();
      }
    };
  }, [scriptId]);

  // Auto-scroll to bottom
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  return (
    <div className="card mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          Live Test Output
          {status === 'running' && <span className="ml-3 text-sm text-gray-400">(Running...)</span>}
          {status === 'completed' && (
            <span className="ml-3">
              {exitCode === 0 ? (
                <span className="badge badge-success">Success</span>
              ) : (
                <span className="badge badge-danger">Failed (exit code: {exitCode})</span>
              )}
            </span>
          )}
        </h2>
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="bg-gray-950 border border-gray-700 rounded p-4 h-96 overflow-y-auto font-mono text-sm">
        {output.length === 0 && status === 'connecting' && (
          <div className="text-gray-500">Connecting...</div>
        )}
        {output.length === 0 && status === 'running' && (
          <div className="text-gray-500">Waiting for output...</div>
        )}
        {output.map((line, index) => (
          <div
            key={index}
            className={line.stream === 'stderr' ? 'text-red-400' : 'text-gray-300'}
          >
            {line.content}
          </div>
        ))}
        {status === 'error' && output.length === 0 && (
          <div className="text-red-400">Connection error. Please try again.</div>
        )}
        <div ref={outputEndRef} />
      </div>

      {status === 'completed' && runId && (
        <div className="mt-3 text-sm text-gray-400">
          Run ID: {runId}
        </div>
      )}
    </div>
  );
}

export default LiveOutput;
