import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

function RunDetail() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inProgress, setInProgress] = useState(false);

  useEffect(() => {
    loadRun();
    loadLogs();

    // Poll for updates if run is in progress
    const interval = setInterval(() => {
      if (inProgress) {
        loadRun();
        loadLogs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id, inProgress]);

  const loadRun = async () => {
    try {
      const response = await fetch(`/api/runs/${id}`);
      if (!response.ok) throw new Error('Failed to fetch run');
      const data = await response.json();
      setRun(data);
      setInProgress(data.finished_at === null);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetch(`/api/runs/${id}/logs`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.logs);
    } catch (err) {
      console.error('Error loading logs:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (start, end) => {
    if (!start) return 'N/A';
    if (!end) return 'Running...';
    const ms = new Date(end) - new Date(start);
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-400">Loading run...</div>;
  if (error) return <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">{error}</div>;
  if (!run) return <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">Run not found</div>;

  return (
    <div className="max-w-7xl mx-auto py-6">
      <Link to={`/scripts/${run.script_id}`} className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
        &larr; Back to Script
      </Link>

      <div className="card mb-6">
        <h1 className="text-2xl font-bold mb-4">Run #{run.id}</h1>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-400">Type:</span>
            <span className={`ml-2 badge ${run.type === 'test' ? 'badge-info' : 'badge-warning'}`}>
              {run.type}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-400">Started:</span>
            <span className="ml-2 text-gray-200">{formatDate(run.started_at)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-400">Finished:</span>
            <span className="ml-2 text-gray-200">{formatDate(run.finished_at)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-400">Duration:</span>
            <span className="ml-2 text-gray-200">{formatDuration(run.started_at, run.finished_at)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-400">Exit Code:</span>
            <span className="ml-2">
              {run.exit_code === null ? (
                <span className="badge badge-info">Running</span>
              ) : run.exit_code === 0 ? (
                <span className="badge badge-success">{run.exit_code}</span>
              ) : (
                <span className="badge badge-danger">{run.exit_code}</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Output Logs</h2>
        {inProgress && (
          <div className="mb-3 text-sm text-gray-400 italic">
            Run in progress... (auto-refreshing)
          </div>
        )}
        {logs.length === 0 ? (
          <p className="text-gray-400">No output yet.</p>
        ) : (
          <div className="bg-gray-950 border border-gray-700 rounded p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
            <pre className="text-sm font-mono">
              {logs.map((log, index) => (
                <code
                  key={index}
                  className={`block ${log.stream === 'stderr' ? 'text-red-400' : 'text-gray-300'}`}
                >
                  {log.content}
                </code>
              ))}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default RunDetail;
