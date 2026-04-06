import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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

function ScriptList() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [createMode, setCreateMode] = useState('paste'); // 'paste' or 'upload'
  const [cronMode, setCronMode] = useState('simple'); // 'simple' or 'advanced'
  const [uploadForm, setUploadForm] = useState({
    name: '',
    cronExpression: '* * * * *',
    enabled: true,
    file: null,
    content: ''
  });

  useEffect(() => {
    loadScripts();

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadScripts, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadScripts = async () => {
    try {
      const response = await fetch('/api/scripts');
      if (!response.ok) throw new Error('Failed to fetch scripts');
      const data = await response.json();
      setScripts(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (createMode === 'paste') {
        // Create from pasted content
        const response = await fetch('/api/scripts/from-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: uploadForm.name,
            cronExpression: uploadForm.cronExpression,
            enabled: uploadForm.enabled,
            content: uploadForm.content
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create script');
        }
      } else {
        // Upload from file
        const formData = new FormData();
        formData.append('name', uploadForm.name);
        formData.append('cronExpression', uploadForm.cronExpression);
        formData.append('enabled', uploadForm.enabled ? '1' : '0');
        formData.append('file', uploadForm.file);

        const response = await fetch('/api/scripts', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to upload script');
        }
      }

      setShowUploadForm(false);
      setUploadForm({ name: '', cronExpression: '* * * * *', enabled: true, file: null, content: '' });
      loadScripts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleEnabled = async (scriptId, currentEnabled) => {
    try {
      const script = scripts.find(s => s.id === scriptId);
      const formData = new FormData();
      formData.append('name', script.name);
      formData.append('cronExpression', script.cron_expression);
      formData.append('enabled', !currentEnabled ? '1' : '0');

      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to update script');

      loadScripts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (scriptId) => {
    if (!confirm('Are you sure you want to delete this script?')) return;

    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete script');

      loadScripts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const handleShowForm = () => {
    setShowUploadForm(!showUploadForm);
    if (!showUploadForm) {
      // Reset form when opening
      setUploadForm({ name: '', cronExpression: '* * * * *', enabled: true, file: null, content: '' });
      setCronMode('simple');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-400">Loading scripts...</div>;

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Script Runner</h1>
        <button
          className="btn btn-primary"
          onClick={handleShowForm}
        >
          {showUploadForm ? 'Cancel' : 'Create Script'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showUploadForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Script</h2>

          {/* Mode Toggle */}
          <div className="flex space-x-2 mb-4 border-b border-gray-700 pb-2">
            <button
              type="button"
              onClick={() => setCreateMode('paste')}
              className={`px-4 py-2 rounded-t ${
                createMode === 'paste'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Paste Code
            </button>
            <button
              type="button"
              onClick={() => setCreateMode('upload')}
              className={`px-4 py-2 rounded-t ${
                createMode === 'upload'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Upload File
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                required
                className="input w-full"
                placeholder="My Script"
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
                  value={uploadForm.cronExpression}
                  onChange={(e) => setUploadForm({ ...uploadForm, cronExpression: e.target.value })}
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
                    value={uploadForm.cronExpression}
                    onChange={(e) => setUploadForm({ ...uploadForm, cronExpression: e.target.value })}
                    placeholder="* * * * *"
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
                  checked={uploadForm.enabled}
                  onChange={(e) => setUploadForm({ ...uploadForm, enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-300">Enabled</span>
              </label>
            </div>

            {createMode === 'paste' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Script Content
                </label>
                <textarea
                  value={uploadForm.content}
                  onChange={(e) => setUploadForm({ ...uploadForm, content: e.target.value })}
                  rows={15}
                  required
                  className="input w-full font-mono text-sm"
                  placeholder="// Paste your JavaScript code here&#10;console.log('Hello, world!');"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Write or paste your JavaScript code above
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Script File (.js)
                </label>
                <input
                  type="file"
                  accept=".js"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  required
                  className="input w-full"
                />
              </div>
            )}

            <button type="submit" className="btn btn-success">
              Create Script
            </button>
          </form>
        </div>
      )}

      {scripts.length === 0 ? (
        <div className="card">
          <p className="text-gray-400">No scripts created yet. Click "Create Script" to get started.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cron Expression</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Enabled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Run</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {scripts.map(script => (
                <tr key={script.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link to={`/scripts/${script.id}`} className="text-blue-400 hover:text-blue-300">
                      {script.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm text-gray-300">{script.cron_expression}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={script.enabled}
                        onChange={() => handleToggleEnabled(script.id, script.enabled)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {formatDate(script.lastRun?.started_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {script.lastRun ? (
                      script.lastRun.exit_code === 0 ? (
                        <span className="badge badge-success">Success</span>
                      ) : script.lastRun.exit_code === null ? (
                        <span className="badge badge-info">Running</span>
                      ) : (
                        <span className="badge badge-danger">Failed ({script.lastRun.exit_code})</span>
                      )
                    ) : (
                      <span className="badge badge-warning">No runs</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      className="btn btn-danger text-xs py-1 px-3"
                      onClick={() => handleDelete(script.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ScriptList;
