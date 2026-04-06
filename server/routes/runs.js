import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { runsDb, logsDb } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

const router = express.Router();

// GET /api/runs/:id - Get run detail
router.get('/:id', (req, res) => {
  try {
    const run = runsDb.getById.get(req.params.id);

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json(run);
  } catch (error) {
    console.error('Error fetching run:', error);
    res.status(500).json({ error: 'Failed to fetch run' });
  }
});

// GET /api/runs/:id/logs - Get logs for a run
router.get('/:id/logs', async (req, res) => {
  try {
    const run = runsDb.getById.get(req.params.id);

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // For in-progress runs, read from log file
    if (!run.finished_at) {
      const logFilePath = join(rootDir, 'logs', `${run.id}.log`);

      if (existsSync(logFilePath)) {
        try {
          const content = await readFile(logFilePath, 'utf-8');
          return res.json({
            inProgress: true,
            logs: [{
              stream: 'stdout',
              content,
              created_at: run.started_at
            }]
          });
        } catch (error) {
          console.error('Error reading log file:', error);
        }
      }

      return res.json({
        inProgress: true,
        logs: []
      });
    }

    // For completed runs, get from database
    const logs = logsDb.getByRunId.all(run.id);

    res.json({
      inProgress: false,
      logs
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
