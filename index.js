import express from "express";
import videoRoutes from "./routes/video.routes.js";
import { downloadWorker } from "./services/queue.service.js";
import errorHandler from "./middleware/errorHandler.js";
import dotenv from "dotenv";
import cors from "cors";


dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/api", videoRoutes);



app.use(errorHandler);
// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await downloadWorker.close();
  process.exit(0);
});

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
