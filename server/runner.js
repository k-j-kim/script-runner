import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createWriteStream } from 'fs';
import { runsDb, logsDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Default timeout: 5 minutes
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Execute a script and track its execution
 * @param {number} scriptId - Script ID from database
 * @param {string} scriptPath - Path to the script file
 * @param {string} type - 'scheduled' or 'test'
 * @param {Object} options - Execution options
 * @param {Function} options.onLine - Callback for each output line (stream, content)
 * @param {number} options.timeout - Timeout in milliseconds
 * @returns {Promise<{runId, exitCode}>}
 */
export async function executeScript(scriptId, scriptPath, type, options = {}) {
  const { onLine = null, timeout = DEFAULT_TIMEOUT_MS } = options;

  // Create run record
  const runInfo = runsDb.create.run(scriptId, type);
  const runId = runInfo.lastInsertRowid;

  // Set up log file stream
  const logFilePath = join(rootDir, 'logs', `${runId}.log`);
  const logFileStream = createWriteStream(logFilePath, { flags: 'a' });

  return new Promise((resolve) => {
    // Spawn child process with shared NODE_PATH
    const nodePath = join(rootDir, 'node_modules');
    const child = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        NODE_PATH: nodePath
      },
      cwd: rootDir
    });

    let killed = false;
    let timeoutHandle = null;

    // Set up timeout
    if (timeout > 0) {
      timeoutHandle = setTimeout(() => {
        killed = true;
        child.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, timeout);
    }

    // Handle stdout
    child.stdout.on('data', (data) => {
      const content = data.toString();
      logFileStream.write(content);
      logsDb.create.run(runId, 'stdout', content);

      if (onLine) {
        onLine('stdout', content);
      }
    });

    // Handle stderr
    child.stderr.on('data', (data) => {
      const content = data.toString();
      logFileStream.write(content);
      logsDb.create.run(runId, 'stderr', content);

      if (onLine) {
        onLine('stderr', content);
      }
    });

    // Handle process exit
    child.on('close', (code) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      logFileStream.end();

      // If killed by timeout, set exit code to indicate failure
      const exitCode = killed ? 124 : code;

      // Update run record
      runsDb.finish.run(exitCode, runId);

      resolve({ runId, exitCode });
    });

    // Handle spawn errors
    child.on('error', (error) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      const errorContent = `Error spawning process: ${error.message}\n`;
      logFileStream.write(errorContent);
      logsDb.create.run(runId, 'stderr', errorContent);
      logFileStream.end();

      if (onLine) {
        onLine('stderr', errorContent);
      }

      // Mark as failed
      runsDb.finish.run(1, runId);
      resolve({ runId, exitCode: 1 });
    });
  });
}

/**
 * Run a script in test mode with optional line callback
 * @param {number} scriptId
 * @param {string} scriptPath
 * @param {Function} onLine - Callback for each output line
 * @returns {Promise<{runId, exitCode}>}
 */
export async function testScript(scriptId, scriptPath, onLine) {
  return executeScript(scriptId, scriptPath, 'test', { onLine });
}

/**
 * Run a script in scheduled mode
 * @param {number} scriptId
 * @param {string} scriptPath
 * @returns {Promise<{runId, exitCode}>}
 */
export async function runScheduledScript(scriptId, scriptPath) {
  return executeScript(scriptId, scriptPath, 'scheduled');
}
