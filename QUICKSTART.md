# Quick Start Guide

## What You Have

A fully functional Script Runner application that allows you to:
- Upload JavaScript files
- Schedule them with cron expressions
- Test with live output streaming
- View run history and logs

## Setup Complete ✅

The following has been implemented:

1. ✅ **Backend** - Express server with API routes
2. ✅ **Database** - SQLite with scripts, runs, and logs tables
3. ✅ **Scheduler** - node-cron for automated execution
4. ✅ **Runner** - Child process execution with timeout
5. ✅ **Frontend** - React SPA with live SSE output
6. ✅ **Dependencies** - All packages installed
7. ✅ **Build** - Frontend compiled to `public/`

## Start the Application

```bash
# Start the server
npm start

# Or with PM2 for production
pm2 start ecosystem.config.js
```

The server will start on http://localhost:3000

## First Steps

1. **Upload a test script**
   - Use one from `docs/examples/hello.js`
   - Name: "Hello Test"
   - Cron: `* * * * *` (every minute)
   - Enable it

2. **Test live output**
   - Click on the script
   - Click "Test" button
   - Watch output stream in real-time

3. **Wait for scheduled run**
   - After 1 minute, check run history
   - Should see a "scheduled" run appear

4. **Test error handling**
   - Upload `docs/examples/error.js`
   - Run it
   - See non-zero exit code and error in logs

## Example Scripts

Ready-to-use examples in `docs/examples/`:

- **hello.js** - Simple logging
- **error.js** - Error handling test
- **stderr.js** - Stdout/stderr differentiation
- **infinite-loop.js** - Timeout test (will be killed after 5 minutes)

## Adding Dependencies

```bash
# Install any package in the root
npm install axios

# Use it in your scripts
// my-script.js
import axios from 'axios';
const response = await axios.get('https://api.example.com');
console.log(response.data);
```

## Development Mode

```bash
# Terminal 1: API server with auto-restart
npm run dev

# Terminal 2: Frontend dev server with hot reload
npm run client:dev
```

Access dev frontend at http://localhost:5173

## Verification Checklist

From the design spec:

- [x] ✅ Upload script that logs date
- [x] ✅ Set cron to run every minute
- [x] ✅ Live test output streams
- [x] ✅ Scripts use shared node_modules
- [x] ✅ Error scripts show non-zero exit
- [x] ✅ Timeout kills infinite loops

## Architecture

- **Server**: Express monolith (server/index.js)
- **Database**: SQLite (scripts.sqlite)
- **Scheduler**: node-cron (server/scheduler.js)
- **Runner**: child_process (server/runner.js)
- **Frontend**: React + Vite (client/)
- **Logs**: File system + SQLite

## API Endpoints

- `GET /api/scripts` - List scripts
- `POST /api/scripts` - Upload script
- `GET /api/scripts/:id` - Script details
- `PUT /api/scripts/:id` - Update script
- `DELETE /api/scripts/:id` - Delete script
- `POST /api/scripts/:id/run` - Run now
- `GET /api/scripts/:id/test` - SSE live test
- `GET /api/scripts/:id/runs` - Run history
- `GET /api/runs/:id` - Run details
- `GET /api/runs/:id/logs` - Run logs

## Troubleshooting

**Server won't start:**
- Check port 3000 is available
- Run `npm install` again

**Frontend not loading:**
- Rebuild: `npm run build`
- Check `public/` directory exists

**Scripts not running:**
- Check cron expression is valid
- Ensure script is enabled
- Check server logs for errors

**Dependencies not found in scripts:**
- Install in root: `npm install <package>`
- Restart server to pick up new NODE_PATH

## Next Steps

1. Start the server: `npm start`
2. Open http://localhost:3000
3. Upload your first script
4. Set a cron schedule
5. Click "Test" to see live output
6. Watch automated runs in history

Enjoy your Script Runner! 🚀
