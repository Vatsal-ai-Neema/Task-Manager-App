# Simple Task Manager API + UI

This project is a basic full-stack task manager built for the Bidyut placement-drive task.

## Features

- Create a task
- View all tasks
- Update a task
- Delete a task
- Toggle task status between `pending` and `completed`
- Basic validation: title and description cannot be empty
- Simple responsive UI connected to the backend
- File-based persistence using `data/tasks.json`

## Tech Stack

- Backend: Node.js HTTP server
- Frontend: HTML, CSS, JavaScript
- Storage: Local JSON file

## Project Structure

```text
.
|-- data/
|   `-- tasks.json
|-- public/
|   |-- app.js
|   |-- index.html
|   `-- styles.css
|-- package.json
|-- README.md
`-- server.js
```

## Run Locally

1. Make sure Node.js is installed.
2. Start the server:

```bash
npm start
```

3. Open:

```text
http://localhost:3000
```

## API Endpoints

### Health Check

- `GET /api/health`

Response:

```json
{
  "status": "ok"
}
```

### Get All Tasks

- `GET /api/tasks`

### Create Task

- `POST /api/tasks`

Request body:

```json
{
  "title": "Prepare technical round",
  "description": "Finish the full-stack task manager"
}
```

Response fields:

- `id`
- `title`
- `description`
- `status`
- `created_at`

### Update Task

- `PUT /api/tasks/:id`

Request body:

```json
{
  "title": "Prepare technical round",
  "description": "Update the README",
  "status": "pending"
}
```

### Toggle / Partial Update

- `PATCH /api/tasks/:id`

Request body:

```json
{
  "status": "completed"
}
```

### Delete Task

- `DELETE /api/tasks/:id`

## Validation

- Title is required.
- Description is required.
- Status must be either `pending` or `completed`.

## Postman Testing Steps

1. Create a new collection named `Task Manager`.
2. Add requests for:
   - `GET /api/tasks`
   - `POST /api/tasks`
   - `PUT /api/tasks/:id`
   - `PATCH /api/tasks/:id`
   - `DELETE /api/tasks/:id`
3. Use `http://localhost:3000` as the base URL.

## Deployment

You can deploy this on platforms such as:

- Render
- Railway
- Cyclic

Recommended quick deployment:

1. Push the project to GitHub.
2. Create a new Web Service on Render.
3. Use:
   - Build command: none
   - Start command: `npm start`
4. Deploy and open the generated public URL.

## Quick Render Setup

If Render asks for more details, use:

- Runtime: `Node`
- Root Directory: leave empty
- Build Command: leave empty
- Start Command: `npm start`
- Environment Variables: none required

## Submission Checklist

- Deployed project link
- README/documentation
- API endpoint list
- Screenshots of UI
