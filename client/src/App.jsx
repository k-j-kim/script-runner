import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScriptList from './pages/ScriptList';
import ScriptDetail from './pages/ScriptDetail';
import RunDetail from './pages/RunDetail';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4">
          <Routes>
            <Route path="/" element={<ScriptList />} />
            <Route path="/scripts/:id" element={<ScriptDetail />} />
            <Route path="/runs/:id" element={<RunDetail />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
