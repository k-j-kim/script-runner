import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlink, existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { scriptsDb, runsDb } from '../db.js';
import { scheduleScript, unscheduleScript, updateSchedule } from '../scheduler.js';
import { testScript, runScheduledScript } from '../runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(rootDir, 'scripts'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith('.js')) {
      return cb(new Error('Only .js files are allowed'));
    }
    cb(null, true);
  }
});

// GET /api/scripts - List all scripts
router.get('/', (req, res) => {
  try {
    const scripts = scriptsDb.getAll.all();

    // Attach last run info to each script
    const scriptsWithRuns = scripts.map(script => {
      const lastRun = runsDb.getLastByScriptId.get(script.id);
      return {
        ...script,
        enabled: Boolean(script.enabled),
        lastRun: lastRun || null
      };
    });

    res.json(scriptsWithRuns);
  } catch (error) {
    console.error('Error fetching scripts:', error);
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

// GET /api/scripts/:id - Get script detail
router.get('/:id', (req, res) => {
  try {
    const script = scriptsDb.getById.get(req.params.id);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    res.json({
      ...script,
      enabled: Boolean(script.enabled)
    });
  } catch (error) {
    console.error('Error fetching script:', error);
    res.status(500).json({ error: 'Failed to fetch script' });
  }
});

// GET /api/scripts/:id/content - Get script file content
router.get('/:id/content', async (req, res) => {
  try {
    const script = scriptsDb.getById.get(req.params.id);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const scriptPath = join(rootDir, 'scripts', script.filename);

    if (!existsSync(scriptPath)) {
      return res.status(404).json({ error: 'Script file not found' });
    }

    const content = await readFile(scriptPath, 'utf-8');
    res.json({ content });
  } catch (error) {
    console.error('Error reading script content:', error);
    res.status(500).json({ error: 'Failed to read script content' });
  }
});

// PATCH /api/scripts/:id/content - Update script file content
router.patch('/:id/content', express.json(), async (req, res) => {
  try {
    const script = scriptsDb.getById.get(req.params.id);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const scriptPath = join(rootDir, 'scripts', script.filename);

    await writeFile(scriptPath, content, 'utf-8');

    res.json({ message: 'Script content updated successfully' });
  } catch (error) {
    console.error('Error updating script content:', error);
    res.status(500).json({ error: 'Failed to update script content' });
  }
});

// POST /api/scripts/from-content - Create new script from pasted content
router.post('/from-content', async (req, res) => {
  try {
    const { name, cronExpression, enabled = true, content } = req.body;

    if (!name || !cronExpression || !content) {
      return res.status(400).json({ error: 'Name, cron expression, and content are required' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${safeName}.js`;
    const filepath = join(rootDir, 'scripts', filename);

    // Write content to file
    await writeFile(filepath, content, 'utf-8');

    // Create script record
    const result = scriptsDb.create.run(
      name,
      filename,
      cronExpression,
      enabled ? 1 : 0
    );

    const scriptId = result.lastInsertRowid;
    const script = scriptsDb.getById.get(scriptId);

    // Schedule if enabled
    if (script.enabled) {
      scheduleScript(script);
    }

    res.status(201).json({
      ...script,
      enabled: Boolean(script.enabled)
    });
  } catch (error) {
    console.error('Error creating script from content:', error);
    res.status(500).json({ error: 'Failed to create script' });
  }
});

// POST /api/scripts - Create new script
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, cronExpression, enabled = '1' } = req.body;

    if (!name || !cronExpression) {
      // Clean up uploaded file
      unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Name and cron expression are required' });
    }

    // Create script record
    const result = scriptsDb.create.run(
      name,
      req.file.filename,
      cronExpression,
      enabled === '1' || enabled === 'true' ? 1 : 0
    );

    const scriptId = result.lastInsertRowid;
    const script = scriptsDb.getById.get(scriptId);

    // Schedule if enabled
    if (script.enabled) {
      scheduleScript(script);
    }

    res.status(201).json({
      ...script,
      enabled: Boolean(script.enabled)
    });
  } catch (error) {
    console.error('Error creating script:', error);
    if (req.file) {
      unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: 'Failed to create script' });
  }
});

// PUT /api/scripts/:id - Update script
router.put('/:id', upload.single('file'), (req, res) => {
  try {
    const script = scriptsDb.getById.get(req.params.id);

    if (!script) {
      if (req.file) {
        unlink(req.file.path, () => {});
      }
      return res.status(404).json({ error: 'Script not found' });
    }

    const { name, cronExpression, enabled } = req.body;

    if (!name || !cronExpression) {
      if (req.file) {
        unlink(req.file.path, () => {});
      }
      return res.status(400).json({ error: 'Name and cron expression are required' });
    }

    // Determine new filename
    let filename = script.filename;
    if (req.file) {
      // Delete old file
      const oldPath = join(rootDir, 'scripts', script.filename);
      if (existsSync(oldPath)) {
        unlink(oldPath, () => {});
      }
      filename = req.file.filename;
    }

    // Update script record
    const enabledValue = enabled === '1' || enabled === 'true' ? 1 : 0;
    scriptsDb.update.run(name, filename, cronExpression, enabledValue, req.params.id);

    const updatedScript = scriptsDb.getById.get(req.params.id);

    // Update schedule
    updateSchedule(updatedScript);

    res.json({
      ...updatedScript,
      enabled: Boolean(updatedScript.enabled)
    });
  } catch (error) {
    console.error('Error updating script:', error);
    if (req.file) {
      unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: 'Failed to update script' });
  }
});

// DELETE /api/scripts/:id - Delete script
router.delete('/:id', (req, res) => {
  try {
    const script = scriptsDb.getById.get(req.params.id);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Unschedule
    unscheduleScript(script.id);

    // Delete file
    const scriptPath = join(rootDir, 'scripts', script.filename);
    if (existsSync(scriptPath)) {
      unlink(scriptPath, () => {});
    }

    // Delete from database (cascade deletes runs and logs)
    scriptsDb.delete.run(script.id);

    res.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

// POST /api/scripts/:id/run - Trigger immediate run
router.post('/:id/run', async (req, res) => {
  try {
    const script = scriptsDb.getById.get(req.params.id);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const scriptPath = join(rootDir, 'scripts', script.filename);

    // Run in background
    runScheduledScript(script.id, scriptPath).catch(error => {
      console.error(`Error running script ${script.id}:`, error);
    });

    res.json({ message: 'Script execution started' });
  } catch (error) {
    console.error('Error triggering script run:', error);
    res.status(500).json({ error: 'Failed to trigger script run' });
  }
});

// GET /api/scripts/:id/test - Test run with SSE live output
router.get('/:id/test', async (req, res) => {
  try {
    const script = scriptsDb.getById.get(req.params.id);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const scriptPath = join(rootDir, 'scripts', script.filename);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connected message
    res.write('data: {"type":"connected"}\n\n');

    // Execute script with line callback
    const result = await testScript(script.id, scriptPath, (stream, content) => {
      const data = JSON.stringify({ type: 'output', stream, content });
      res.write(`data: ${data}\n\n`);
    });

    // Send completion event
    const completeData = JSON.stringify({
      type: 'complete',
      runId: result.runId,
      exitCode: result.exitCode
    });
    res.write(`data: ${completeData}\n\n`);

    res.end();
  } catch (error) {
    console.error('Error running test script:', error);
    const errorData = JSON.stringify({
      type: 'error',
      message: error.message
    });
    res.write(`data: ${errorData}\n\n`);
    res.end();
  }
});

// GET /api/scripts/:id/runs - Get run history for a script
router.get('/:id/runs', (req, res) => {
  try {
    const script = scriptsDb.getById.get(req.params.id);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const runs = runsDb.getByScriptId.all(script.id, limit, offset);
    const { count } = runsDb.countByScriptId.get(script.id);

    res.json({
      runs,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching script runs:', error);
    res.status(500).json({ error: 'Failed to fetch runs' });
  }
});

export default router;
