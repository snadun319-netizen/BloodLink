import express from "express";
import dotenv from "dotenv";
import { pool } from "./db";
import authRoutes from "./routes/auth.routes";
import { authenticate } from "./middleware/auth.middleware";
import organizationRoutes from "./routes/organization.routes";
import donorVerificationRoutes from "./routes/donorVerification.routes";
import staffRoutes from "./routes/staff.routes";
import adminRoutes from "./routes/admin.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/donors", donorVerificationRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "ok",
      message: "BloodLink backend is running",
      dbTime: result.rows[0].now,
    });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", message: "Database connection failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
