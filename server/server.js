const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
const connectDB = require("./config/db");
const apiRoutes = require("./routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.disable("x-powered-by");
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    message: "IELTS Platform API",
    docs: "/api/v1",
  });
});

app.use("/api/v1", apiRoutes);

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start", error);
    process.exit(1);
  }
}

startServer();
