import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scriptsDb } from './db.js';
import { runScheduledScript } from './runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Map to store active cron jobs: scriptId -> ScheduledTask
const activeJobs = new Map();

/**
 * Initialize scheduler by loading all enabled scripts
 */
export function initScheduler() {
  const scripts = scriptsDb.getEnabled.all();
  console.log(`[Scheduler] Loading ${scripts.length} enabled script(s)`);

  for (const script of scripts) {
    scheduleScript(script);
  }

  console.log('[Scheduler] Initialization complete');
}

/**
 * Schedule a script to run on its cron expression
 * @param {Object} script - Script record from database
 */
export function scheduleScript(script) {
  // Validate cron expression
  if (!cron.validate(script.cron_expression)) {
    console.error(`[Scheduler] Invalid cron expression for script ${script.id}: ${script.cron_expression}`);
    return;
  }

  // Remove existing job if any
  unscheduleScript(script.id);

  // Create new cron job
  const scriptPath = join(rootDir, 'scripts', script.filename);
  const task = cron.schedule(script.cron_expression, async () => {
    console.log(`[Scheduler] Triggering script ${script.id} (${script.name})`);
    try {
      const result = await runScheduledScript(script.id, scriptPath);
      console.log(`[Scheduler] Script ${script.id} completed with exit code ${result.exitCode}`);
    } catch (error) {
      console.error(`[Scheduler] Error running script ${script.id}:`, error);
    }
  });

  activeJobs.set(script.id, task);
  console.log(`[Scheduler] Scheduled script ${script.id} (${script.name}) with cron: ${script.cron_expression}`);
}

/**
 * Remove a script from the scheduler
 * @param {number} scriptId
 */
export function unscheduleScript(scriptId) {
  const task = activeJobs.get(scriptId);
  if (task) {
    task.stop();
    activeJobs.delete(scriptId);
    console.log(`[Scheduler] Unscheduled script ${scriptId}`);
  }
}

/**
 * Update a script's schedule (removes old, adds new if enabled)
 * @param {Object} script - Updated script record
 */
export function updateSchedule(script) {
  unscheduleScript(script.id);

  if (script.enabled) {
    scheduleScript(script);
  }
}

/**
 * Get list of currently scheduled script IDs
 * @returns {number[]}
 */
export function getScheduledScripts() {
  return Array.from(activeJobs.keys());
}

/**
 * Stop all scheduled jobs (for graceful shutdown)
 */
export function stopAll() {
  console.log('[Scheduler] Stopping all scheduled jobs');
  for (const [scriptId, task] of activeJobs.entries()) {
    task.stop();
  }
  activeJobs.clear();
}
