import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import 'dotenv/config';

import publicRoutes from "./src/routes/public.js";
import adminAuth from "./src/routes/admin/auth.js";
import adminOverview from "./src/routes/admin/overview.js";
import adminPages from "./src/routes/admin/pages.js";
import adminMenus from "./src/routes/admin/menus.js";
import adminSlider from "./src/routes/admin/slider.js";
import adminEvents from "./src/routes/admin/events.js";
import adminMedia from "./src/routes/admin/media.js";
import adminFooter from "./src/routes/admin/footer.js";
import adminSettings from "./src/routes/admin/settings.js";
import adminProfile from "./src/routes/admin/profile.js";

const app = express();
app.use(cors());
app.use(express.json({limit:"5mb"}));
app.use(morgan("dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (_,res)=>res.json({ok:true}));

app.use("/api/public", publicRoutes);
app.use("/api/admin/auth", adminAuth);
app.use("/api/admin/overview", adminOverview);
app.use("/api/admin/pages", adminPages);
app.use("/api/admin/menus", adminMenus);
app.use("/api/admin/slider", adminSlider);
app.use("/api/admin/events", adminEvents);
app.use("/api/admin/media", adminMedia);
app.use("/api/admin/footer", adminFooter);
app.use("/api/admin/settings", adminSettings);
app.use("/api/admin/profile", adminProfile);

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=> console.log("API running on http://localhost:"+PORT));
