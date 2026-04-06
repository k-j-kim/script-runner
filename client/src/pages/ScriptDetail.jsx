import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import LiveOutput from '../components/LiveOutput';

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 9:00 AM', value: '0 9 * * *' },
  { label: 'Daily at 5:00 PM', value: '0 17 * * *' },
  { label: 'Weekly on Monday at 9:00 AM', value: '0 9 * * 1' },
  { label: 'Monthly on 1st at midnight', value: '0 0 1 * *' }
];

function ScriptDetail() {
  const { id } = useParams();
  const [script, setScript] = useState(null);
  const [scriptContent, setScriptContent] = useState('');
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLiveOutput, setShowLiveOutput] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [cronMode, setCronMode] = useState('simple');
  const [editForm, setEditForm] = useState({
    name: '',
    cronExpression: '',
    enabled: true,
    file: null
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadScript();
    loadScriptContent();
    loadRuns();
  }, [id, pagination.page]);

  // Auto-refresh run history every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadRuns();
    }, 10000);

    return () => clearInterval(interval);
  }, [id, pagination.page]);

  const loadScript = async () => {
    try {
      const response = await fetch(`/api/scripts/${id}`);
      if (!response.ok) throw new Error('Failed to fetch script');
      const data = await response.json();
      setScript(data);
      setEditForm({
        name: data.name,
        cronExpression: data.cron_expression,
        enabled: data.enabled,
        file: null
      });

      // Auto-detect if it's a preset value
      const isPreset = CRON_PRESETS.some(p => p.value === data.cron_expression);
      setCronMode(isPreset ? 'simple' : 'advanced');

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadScriptContent = async () => {
    try {
      const response = await fetch(`/api/scripts/${id}/content`);
      if (!response.ok) throw new Error('Failed to fetch script content');
      const data = await response.json();
      setScriptContent(data.content);
    } catch (err) {
      console.error('Error loading script content:', err);
    }
  };

  const loadRuns = async () => {
    try {
      const response = await fetch(`/api/scripts/${id}/runs?page=${pagination.page}&limit=${pagination.limit}`);
      if (!response.ok) throw new Error('Failed to fetch runs');
      const data = await response.json();
      setRuns(data.runs);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error loading runs:', err);
    }
  };

  const handleRunNow = async () => {
    try {
      const response = await fetch(`/api/scripts/${id}/run`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to trigger run');
      alert('Script execution started. Check run history below.');
      setTimeout(loadRuns, 1000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleTestRun = () => {
    setShowLiveOutput(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    // Update script content first if in edit mode
    if (editMode) {
      try {
        const contentResponse = await fetch(`/api/scripts/${id}/content`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: scriptContent })
        });

        if (!contentResponse.ok) {
          throw new Error('Failed to update script content');
        }
      } catch (err) {
        alert(`Error updating content: ${err.message}`);
        return;
      }
    }

    const formData = new FormData();
    formData.append('name', editForm.name);
    formData.append('cronExpression', editForm.cronExpression);
    formData.append('enabled', editForm.enabled ? '1' : '0');
    if (editForm.file) {
      formData.append('file', editForm.file);
    }

    try {
      const response = await fetch(`/api/scripts/${id}`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update script');
      }

      setEditMode(false);
      loadScript();
      loadScriptContent();
      loadRuns();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const ms = new Date(end) - new Date(start);
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getCronLabel = (cronExpr) => {
    const preset = CRON_PRESETS.find(p => p.value === cronExpr);
    return preset ? preset.label : cronExpr;
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-400">Loading script...</div>;
  if (error) return <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">{error}</div>;
  if (!script) return <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">Script not found</div>;

  return (
    <div className="max-w-7xl mx-auto py-6">
      <Link to="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
        &larr; Back to Scripts
      </Link>

      <div className="card mb-6">
        <h1 className="text-2xl font-bold mb-4">{script.name}</h1>

        {editMode ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                className="input w-full"
              />
            </div>

            {/* Cron Expression Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">Schedule</label>
                <div className="flex space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCronMode('simple')}
                    className={`px-3 py-1 rounded ${
                      cronMode === 'simple'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => setCronMode('advanced')}
                    className={`px-3 py-1 rounded ${
                      cronMode === 'advanced'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Advanced
                  </button>
                </div>
              </div>

              {cronMode === 'simple' ? (
                <select
                  value={editForm.cronExpression}
                  onChange={(e) => setEditForm({ ...editForm, cronExpression: e.target.value })}
                  className="input w-full"
                  required
                >
                  {CRON_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label} ({preset.value})
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    value={editForm.cronExpression}
                    onChange={(e) => setEditForm({ ...editForm, cronExpression: e.target.value })}
                    required
                    className="input w-full font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: minute hour day month weekday
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editForm.enabled}
                  onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-300">Enabled</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Script Content</label>
              <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                rows={15}
                className="input w-full font-mono text-sm"
                placeholder="// Your JavaScript code here"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Replace Script File (optional)</label>
              <input
                type="file"
                accept=".js"
                onChange={(e) => setEditForm({ ...editForm, file: e.target.files[0] })}
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Uploading a new file will replace the content above</p>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn btn-success">Save</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-400">File:</span>
              <span className="ml-2 text-gray-200">{script.filename}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-400">Schedule:</span>
              <span className="ml-2 text-gray-200">{getCronLabel(script.cron_expression)}</span>
              <code className="ml-2 text-gray-400 bg-gray-900 px-2 py-1 rounded text-xs">{script.cron_expression}</code>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-400">Status:</span>
              <span className="ml-2">
                {script.enabled ? (
                  <span className="badge badge-success">Enabled</span>
                ) : (
                  <span className="badge badge-danger">Disabled</span>
                )}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Script Content:</label>
              <pre className="bg-gray-900 border border-gray-700 rounded p-4 overflow-x-auto text-sm max-h-96 overflow-y-auto">
                <code className="text-gray-300">{scriptContent || 'Loading...'}</code>
              </pre>
            </div>
            <div className="flex space-x-3 pt-2">
              <button className="btn btn-primary" onClick={handleTestRun}>
                Test (Live Output)
              </button>
              <button className="btn btn-success" onClick={handleRunNow}>
                Run Now
              </button>
              <button className="btn btn-warning" onClick={() => setEditMode(true)}>
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      {showLiveOutput && (
        <LiveOutput
          scriptId={id}
          onClose={() => {
            setShowLiveOutput(false);
            loadRuns();
          }}
        />
      )}

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Run History</h2>
        {runs.length === 0 ? (
          <p className="text-gray-400">No runs yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Started At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Exit Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {runs.map(run => (
                    <tr key={run.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${run.type === 'test' ? 'badge-info' : 'badge-warning'}`}>
                          {run.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(run.started_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDuration(run.started_at, run.finished_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {run.exit_code === null ? (
                          <span className="badge badge-info">Running</span>
                        ) : run.exit_code === 0 ? (
                          <span className="badge badge-success">{run.exit_code}</span>
                        ) : (
                          <span className="badge badge-danger">{run.exit_code}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/runs/${run.id}`}>
                          <button className="btn btn-secondary text-xs py-1 px-3">
                            View Logs
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-4">
                <button
                  className="btn btn-secondary"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </button>
                <span className="text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ScriptDetail;
