const express = require("express");
const app = express();

const PORT = process.env.PORT || 3001;
const SERVICE_NAME = process.env.PROCESS_NAME || "Service-A";

app.use(express.json());

/* 
Root endpoint
*/
app.get("/", (req, res) => {
  res.json({
    service: SERVICE_NAME,
    message: "Welcome to Service A",
    timestamp: new Date().toISOString(),
  });
});

/* 
Users endpoint
*/
app.get("/users", (req, res) => {
  const users = [
    {
      id: 1,
      name: "Alice Johnson",
      email: "alice@example.com",
      service: SERVICE_NAME,
    },
    {
      id: 2,
      name: "Bob Smith",
      email: "bob@example.com",
      service: SERVICE_NAME,
    },
    {
      id: 3,
      name: "Charlie Brown",
      email: "charlie@example.com",
      service: SERVICE_NAME,
    },
  ];

  res.json({
    service: SERVICE_NAME,
    data: users,
    count: users.length,
    timestamp: new Date().toISOString(),
  });
});

// get user by id
app.get("/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const user = {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`,
    service: SERVICE_NAME,
  };

  res.json({
    service: SERVICE_NAME,
    data: user,
    timestamp: new Date().toISOString(),
  });
});

// create user
app.post("/users", (req, res) => {
  const newUser = {
    id: Math.floor(Math.random() * 1000),
    ...req.body,
    service: SERVICE_NAME,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    service: SERVICE_NAME,
    message: "User created successfully",
    data: newUser,
  });
});

/* 
Health check endpoint
*/
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: SERVICE_NAME,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    service: SERVICE_NAME,
    error: "Internal Server Error",
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} is running on port ${PORT}`);
});
