const express = require("express");
const path = require("path");
const session = require("express-session");
const sql = require("mssql");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "change-this-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60
    }
}));

app.use(express.static(path.join(__dirname, "public")));

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT) || 1433,
    options: {
        encrypt: true,
        trustServerCertificate: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
};

async function startServer() {
    try {
        if (!dbConfig.user || !dbConfig.password || !dbConfig.server || !dbConfig.database) {
            throw new Error("Missing database settings. Check your .env file.");
        }

        const pool = await sql.connect(dbConfig);

        // Store the ACTUAL pool, not a function returning the pool.
        app.set("db", pool);

        console.log("Connected to Azure SQL Database");
        console.log(`Database: ${dbConfig.database}`);
        console.log(`Server: ${dbConfig.server}`);

        const authRoutes = require("./routes/auth");
        const noticeRoutes = require("./routes/notices");

        app.use("/api/auth", authRoutes);
        app.use("/api/notices", noticeRoutes);

        app.get("/api/health", async (req, res) => {
            try {
                const db = req.app.get("db");
                await db.request().query("SELECT 1 AS ok");
                res.json({ success: true, database: "connected" });
            } catch (error) {
                console.error("Health check error:", error);
                res.status(500).json({ success: false, database: "error" });
            }
        });

        app.get("/", (req, res) => {
            res.sendFile(path.join(__dirname, "public", "index.html"));
        });

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Database connection failed:");
        console.error(error);
        process.exit(1);
    }
}

startServer();
