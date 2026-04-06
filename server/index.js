import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import scriptsRouter from './routes/scripts.js';
import runsRouter from './routes/runs.js';
import { initScheduler, stopAll } from './scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/scripts', scriptsRouter);
app.use('/api/runs', runsRouter);

// Serve static frontend
const publicDir = join(rootDir, 'public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(join(publicDir, 'index.html'));
  });
} else {
  // Development mode - no frontend build yet
  app.get('/', (req, res) => {
    res.json({
      message: 'Script Runner API',
      status: 'running',
      note: 'Frontend not built yet. Build with: npm run build'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\nScript Runner server started on port ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/scripts`);
  if (existsSync(publicDir)) {
    console.log(`   UI:  http://localhost:${PORT}`);
  }
  console.log('');

  // Initialize scheduler
  initScheduler();
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n\nShutting down gracefully...');
  stopAll();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
