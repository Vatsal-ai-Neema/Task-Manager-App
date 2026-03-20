const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "tasks.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readTasks() {
  ensureStorage();
  const content = fs.readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function writeTasks(tasks) {
  ensureStorage();
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), "utf-8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function validateTaskInput(input, { partial = false } = {}) {
  const errors = [];

  if (!partial || Object.prototype.hasOwnProperty.call(input, "title")) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) {
      errors.push("Title is required.");
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "description")) {
    const description =
      typeof input.description === "string" ? input.description.trim() : "";
    if (!description) {
      errors.push("Description is required.");
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(input, "status") &&
    !["pending", "completed"].includes(input.status)
  ) {
    errors.push("Status must be either 'pending' or 'completed'.");
  }

  return errors;
}

function buildTask(input) {
  return {
    id: randomUUID(),
    title: input.title.trim(),
    description:
      typeof input.description === "string" ? input.description.trim() : "",
    status: input.status === "completed" ? "completed" : "pending",
    created_at: new Date().toISOString(),
  };
}

function updateTask(task, input) {
  return {
    ...task,
    title:
      typeof input.title === "string" ? input.title.trim() : task.title,
    description:
      typeof input.description === "string"
        ? input.description.trim()
        : task.description,
    status:
      input.status === "completed" || input.status === "pending"
        ? input.status
        : task.status,
  };
}

function serveStaticFile(req, res) {
  let requestedPath = req.url === "/" ? "/index.html" : req.url;
  requestedPath = requestedPath.split("?")[0];

  const normalizedPath = path
    .normalize(path.join(PUBLIC_DIR, requestedPath))
    .replace(/\\/g, "/");
  const publicPath = PUBLIC_DIR.replace(/\\/g, "/");

  if (!normalizedPath.startsWith(publicPath)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.readFile(normalizedPath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        sendText(res, 404, "Not found");
        return;
      }

      sendText(res, 500, "Internal server error");
      return;
    }

    const extension = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[extension] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

async function handleApi(req, res) {
  const { method, url } = req;
  const pathname = url.split("?")[0];
  const taskIdMatch = pathname.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)$/);

  if (method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/health" && method === "GET") {
    sendJson(res, 200, { status: "ok" });
    return true;
  }

  if (pathname === "/api/tasks" && method === "GET") {
    const tasks = readTasks().sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    sendJson(res, 200, tasks);
    return true;
  }

  if (pathname === "/api/tasks" && method === "POST") {
    try {
      const body = await parseBody(req);
      const errors = validateTaskInput(body);
      if (errors.length) {
        sendJson(res, 400, { errors });
        return true;
      }

      const tasks = readTasks();
      const newTask = buildTask(body);
      tasks.push(newTask);
      writeTasks(tasks);
      sendJson(res, 201, newTask);
      return true;
    } catch (error) {
      sendJson(res, 400, { errors: [error.message] });
      return true;
    }
  }

  if (taskIdMatch && method === "PUT") {
    try {
      const body = await parseBody(req);
      const errors = validateTaskInput(body);
      if (errors.length) {
        sendJson(res, 400, { errors });
        return true;
      }

      const taskId = taskIdMatch[1];
      const tasks = readTasks();
      const index = tasks.findIndex((task) => task.id === taskId);
      if (index === -1) {
        sendJson(res, 404, { error: "Task not found." });
        return true;
      }

      tasks[index] = updateTask(tasks[index], body);
      writeTasks(tasks);
      sendJson(res, 200, tasks[index]);
      return true;
    } catch (error) {
      sendJson(res, 400, { errors: [error.message] });
      return true;
    }
  }

  if (taskIdMatch && method === "PATCH") {
    try {
      const body = await parseBody(req);
      const errors = validateTaskInput(body, { partial: true });
      if (errors.length) {
        sendJson(res, 400, { errors });
        return true;
      }

      const taskId = taskIdMatch[1];
      const tasks = readTasks();
      const index = tasks.findIndex((task) => task.id === taskId);
      if (index === -1) {
        sendJson(res, 404, { error: "Task not found." });
        return true;
      }

      tasks[index] = updateTask(tasks[index], body);
      writeTasks(tasks);
      sendJson(res, 200, tasks[index]);
      return true;
    } catch (error) {
      sendJson(res, 400, { errors: [error.message] });
      return true;
    }
  }

  if (taskIdMatch && method === "DELETE") {
    const taskId = taskIdMatch[1];
    const tasks = readTasks();
    const filteredTasks = tasks.filter((task) => task.id !== taskId);

    if (filteredTasks.length === tasks.length) {
      sendJson(res, 404, { error: "Task not found." });
      return true;
    }

    writeTasks(filteredTasks);
    sendJson(res, 200, { message: "Task deleted successfully." });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const isApiRoute = req.url.startsWith("/api/");

  if (isApiRoute) {
    const handled = await handleApi(req, res);
    if (!handled) {
      sendJson(res, 404, { error: "API route not found." });
    }
    return;
  }

  serveStaticFile(req, res);
});

ensureStorage();
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
