const express = require("express");
const app = express();

const PORT = process.env.PORT || 3002;
const SERVICE_NAME = process.env.SERVICE_NAME || "Service-B";

app.use(express.json());

/* 
Root endpoint 
*/
app.get("/", (req, res) => {
  res.json({
    service: SERVICE_NAME,
    message: "Welcome to Service B",
    timestamp: new Date().toISOString(),
  });
});

/* 
Products endpoint
*/
app.get("/products", (req, res) => {
  const products = [
    {
      id: 101,
      name: "Laptop Pro",
      price: 1500,
      category: "Electronics",
      service: SERVICE_NAME,
    },
    {
      id: 102,
      name: "Wireless Mouse",
      price: 25,
      category: "Accessories",
      service: SERVICE_NAME,
    },
    {
      id: 103,
      name: "USB-C Hub",
      price: 45,
      category: "Accessories",
      service: SERVICE_NAME,
    },
    {
      id: 104,
      name: "Monitor 4K",
      price: 450,
      category: "Electronics",
      service: SERVICE_NAME,
    },
  ];

  res.json({
    service: SERVICE_NAME,
    data: products,
    count: products.length,
    timestamp: new Date().toISOString(),
  });
});

// get product by id
app.get("/products/:id", (req, res) => {
  const productId = parseInt(req.params.id);
  const product = {
    id: productId,
    name: `Product ${productId}`,
    price: Math.floor(Math.random() * 500) + 10,
    category: "General",
    service: SERVICE_NAME,
  };

  res.json({
    service: SERVICE_NAME,
    data: product,
    timestamp: new Date().toISOString(),
  });
});

// create product
app.post("/products", (req, res) => {
  const newProduct = {
    id: Math.floor(Math.random() * 1000) + 100,
    ...req.body,
    service: SERVICE_NAME,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    service: SERVICE_NAME,
    message: "Product created successfully",
    data: newProduct,
  });
});

/* 
Orders endpoint
*/
app.get("/orders", (req, res) => {
  const orders = [
    {
      id: 1001,
      userId: 1,
      productId: 101,
      quantity: 1,
      total: 1500,
      service: SERVICE_NAME,
    },
    {
      id: 1002,
      userId: 2,
      productId: 102,
      quantity: 2,
      total: 50,
      service: SERVICE_NAME,
    },
  ];

  res.json({
    service: SERVICE_NAME,
    data: orders,
    count: orders.length,
    timestamp: new Date().toISOString(),
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
