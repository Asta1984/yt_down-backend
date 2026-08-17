import express from "express";
import videoRoutes from "./routes/video.routes.js";
import { downloadWorker } from "./services/queue.service.js";
import errorHandler from "./middleware/errorHandler.js";
import dotenv from "dotenv";
import cors from "cors";


dotenv.config();
const allowedOrigins = (process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      // no origin = server-to-server/curl/same-origin requests, allow those
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
  })
);
app.use(express.json());
app.use("/api", videoRoutes);



app.use(errorHandler);
// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await downloadWorker.close();
  process.exit(0);
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});