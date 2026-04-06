# Script Runner

A self-hosted tool for writing and scheduling simple JavaScript scripts — scraping pages, pinging APIs, automating fetch-based tasks.

## Features

- **Simple Script Management** - Create scripts by pasting code or uploading `.js` files
- **Easy Scheduling** - Simple mode with preset intervals or advanced cron expressions
- **Inline Editing** - Edit script content directly in the browser
- **Live Output** - Test scripts with real-time output streaming via SSE
- **Run History** - Track all executions with logs and exit codes
- **Shared Dependencies** - Scripts use a shared `node_modules` directory
- **SQLite Storage** - Lightweight database for scripts, runs, and logs
- **Dark Mode UI** - Modern dark theme with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

1. **Install server dependencies:**
   ```bash
   npm install
   ```

2. **Install and build frontend:**
   ```bash
   npm run client:install
   npm run build
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the UI:**
   Open http://localhost:3000 in your browser

### Development Mode

Run the server and frontend separately with hot reload:

```bash
# Terminal 1: Start the API server
npm run dev

# Terminal 2: Start the frontend dev server
npm run client:dev
```

Access the dev frontend at http://localhost:5173

## Usage

### Uploading Scripts

1. Click "Upload Script" on the main page
2. Provide:
   - **Name**: A descriptive label
   - **Cron Expression**: When to run (e.g., `* * * * *` for every minute)
   - **Enabled**: Whether to activate the schedule immediately
   - **File**: Your `.js` script file

### Cron Expression Examples

```
* * * * *     # Every minute
*/5 * * * *   # Every 5 minutes
0 * * * *     # Every hour
0 0 * * *     # Daily at midnight
0 9 * * 1     # Every Monday at 9 AM
```

### Testing Scripts

Click the "Test" button on a script's detail page to:
- Run the script immediately
- See live output in the browser
- Debug issues before scheduling

### Managing Dependencies

Scripts have access to packages installed in the root `node_modules`:

```bash
# Install a package for use in scripts
npm install axios

# Use it in your script
// my-script.js
import axios from 'axios';

const response = await axios.get('https://api.example.com/data');
console.log(response.data);
```

## Production Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js

# View logs
pm2 logs script-runner

# Restart
pm2 restart script-runner

# Stop
pm2 stop script-runner
```

### Using Node Directly

```bash
node server/index.js
```

### Using Docker

```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

See [DOCKER.md](DOCKER.md) for detailed Docker deployment guide.

## Project Structure

```
/
├── server/
│   ├── index.js          # Express app entry point
│   ├── db.js             # SQLite database layer
│   ├── scheduler.js      # Cron job management
│   ├── runner.js         # Script execution engine
│   └── routes/
│       ├── scripts.js    # Script CRUD endpoints
│       └── runs.js       # Run history endpoints
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   └── components/
│   └── vite.config.js
├── scripts/              # Uploaded script files (auto-created)
├── logs/                 # Per-run log files (auto-created)
├── docs/examples/        # Example scripts for testing
├── package.json          # Shared dependencies
└── ecosystem.config.js   # PM2 configuration
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/scripts` | List all scripts |
| POST | `/api/scripts` | Upload new script |
| GET | `/api/scripts/:id` | Get script details |
| GET | `/api/scripts/:id/content` | Get script file content |
| PATCH | `/api/scripts/:id/content` | Update script file content |
| PUT | `/api/scripts/:id` | Update script metadata/file |
| DELETE | `/api/scripts/:id` | Delete script |
| POST | `/api/scripts/:id/run` | Trigger immediate run |
| GET | `/api/scripts/:id/test` | Test run with SSE live output |
| GET | `/api/scripts/:id/runs` | Get run history |
| GET | `/api/runs/:id` | Get run details |
| GET | `/api/runs/:id/logs` | Get run logs |

## Example Scripts

Example scripts are provided in `docs/examples/`:

- `hello.js` - Simple logging example
- `error.js` - Tests error handling
- `infinite-loop.js` - Tests timeout mechanism
- `stderr.js` - Tests stdout/stderr differentiation

## Configuration

Environment variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## Database Reset

To delete all data and start fresh:

```bash
npm run reset
```

This will prompt for confirmation and then remove:
- SQLite database
- All uploaded scripts
- All log files
- Run history

**Warning:** This action cannot be undone!

## Verification Checklist

Based on the design spec, verify these scenarios:

1. ✅ Upload a test script that logs `console.log('hello', new Date())`
2. ✅ Set cron to `* * * * *` (every minute), enable it — confirm run appears after 1 min
3. ✅ Click "Test" — confirm live output streams in the browser
4. ✅ Upload a script that uses an npm package (e.g., `axios`) — confirm it resolves
5. ✅ Upload a script that throws — confirm exit code is non-zero, error in logs
6. ✅ Set timeout, upload infinite loop — confirm it's killed and recorded as failed

## License

MIT

## Architecture Notes

- **Single Process**: Express monolith with three concerns (HTTP, Scheduler, Runner)
- **Scheduler**: `node-cron` loads enabled scripts at startup, dynamically updates
- **Runner**: Child processes execute scripts with shared `NODE_PATH`, captures output
- **Timeout**: Default 5 minutes, kills child process on breach
- **Storage**: SQLite for metadata, file system for logs
