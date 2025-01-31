import { app } from "./app.js";
import { connectDB } from "./db/index.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 7878;
console.log();

dotenv.config();

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://127.0.0.1:${PORT}/`);
    });
  })
  .catch((error) => console.log("Error: ", error));
