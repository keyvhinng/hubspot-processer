// require modules
const dotenv = require("dotenv");
const path = require("path");
const packageJson = require("./package.json");
const mongoose = require("mongoose");
const pullDataFromHubspot = require("./worker");

dotenv.config({ path: path.join(__dirname, ".env") });

const { MONGO_URI } = process.env;

process.env.VERSION = packageJson.version;

mongoose.set("strictQuery", false);

// mongoose connection
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("connected to database");
    require("./Domain");

    // worker setup
    pullDataFromHubspot();
  });

process.env.instance = "app";

// server setup
require("./server");
