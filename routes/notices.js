const express = require("express");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.request().query(`
            SELECT
                id,
                title,
                description,
                category,
                priority,
                posted_by,
                created_at,
                expiry_date,
                is_pinned,
                status
            FROM notices
            WHERE status = 'Active'
            ORDER BY is_pinned DESC, created_at DESC
        `);

        res.json({
            success: true,
            notices: result.recordset
        });
    } catch (error) {
        console.error("GET /api/notices error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to fetch notices"
        });
    }
});

router.get("/all/admin", requireAdmin, async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.request().query(`
            SELECT
                id,
                title,
                description,
                category,
                priority,
                posted_by,
                created_at,
                expiry_date,
                is_pinned,
                status
            FROM notices
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            notices: result.recordset
        });
    } catch (error) {
        console.error("GET /api/notices/all/admin error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to fetch all notices"
        });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.request()
            .input("id", req.params.id)
            .query(`
                SELECT *
                FROM notices
                WHERE id = @id
            `);

        if (!result.recordset.length) {
            return res.status(404).json({
                success: false,
                message: "Notice not found"
            });
        }

        res.json({
            success: true,
            notice: result.recordset[0]
        });
    } catch (error) {
        console.error("GET /api/notices/:id error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to fetch notice"
        });
    }
});

router.post("/", requireAdmin, async (req, res) => {
    try {
        const db = req.app.get("db");
        const {
            title,
            description,
            category,
            priority,
            posted_by,
            expiry_date,
            is_pinned
        } = req.body;

        if (!title || !description || !category) {
            return res.status(400).json({
                success: false,
                message: "Title, description and category are required"
            });
        }

        const result = await db.request()
            .input("title", title.trim())
            .input("description", description.trim())
            .input("category", category)
            .input("priority", priority || "Normal")
            .input("posted_by", posted_by || req.session.admin.name)
            .input("expiry_date", expiry_date || null)
            .input("is_pinned", is_pinned ? 1 : 0)
            .query(`
                INSERT INTO notices
                (title, description, category, priority, posted_by, expiry_date, is_pinned)
                OUTPUT INSERTED.*
                VALUES
                (@title, @description, @category, @priority, @posted_by, @expiry_date, @is_pinned)
            `);

        res.status(201).json({
            success: true,
            message: "Notice created successfully",
            notice: result.recordset[0]
        });
    } catch (error) {
        console.error("POST /api/notices error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to create notice"
        });
    }
});

router.put("/:id", requireAdmin, async (req, res) => {
    try {
        const db = req.app.get("db");
        const {
            title,
            description,
            category,
            priority,
            posted_by,
            expiry_date,
            is_pinned,
            status
        } = req.body;

        const result = await db.request()
            .input("id", req.params.id)
            .input("title", title)
            .input("description", description)
            .input("category", category)
            .input("priority", priority || "Normal")
            .input("posted_by", posted_by || req.session.admin.name)
            .input("expiry_date", expiry_date || null)
            .input("is_pinned", is_pinned ? 1 : 0)
            .input("status", status || "Active")
            .query(`
                UPDATE notices
                SET
                    title = @title,
                    description = @description,
                    category = @category,
                    priority = @priority,
                    posted_by = @posted_by,
                    expiry_date = @expiry_date,
                    is_pinned = @is_pinned,
                    status = @status
                OUTPUT INSERTED.*
                WHERE id = @id
            `);

        if (!result.recordset.length) {
            return res.status(404).json({
                success: false,
                message: "Notice not found"
            });
        }

        res.json({
            success: true,
            message: "Notice updated successfully",
            notice: result.recordset[0]
        });
    } catch (error) {
        console.error("PUT /api/notices/:id error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to update notice"
        });
    }
});

router.delete("/:id", requireAdmin, async (req, res) => {
    try {
        const db = req.app.get("db");

        const result = await db.request()
            .input("id", req.params.id)
            .query(`
                DELETE FROM notices
                OUTPUT DELETED.id
                WHERE id = @id
            `);

        if (!result.recordset.length) {
            return res.status(404).json({
                success: false,
                message: "Notice not found"
            });
        }

        res.json({
            success: true,
            message: "Notice deleted successfully"
        });
    } catch (error) {
        console.error("DELETE /api/notices/:id error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to delete notice"
        });
    }
});

// Students can only read active notices.
router.get("/student/all", async (req, res) => {
    try {
        if (!req.session.student) {
            return res.status(401).json({
                success: false,
                message: "Student login required"
            });
        }

        const db = req.app.get("db");
        const result = await db.request().query(`
            SELECT
                id, title, description, category, priority, posted_by,
                created_at, expiry_date, is_pinned, status
            FROM notices
            WHERE status = 'Active'
              AND (expiry_date IS NULL OR expiry_date >= CAST(GETDATE() AS DATE))
            ORDER BY is_pinned DESC, created_at DESC
        `);

        res.json({
            success: true,
            notices: result.recordset
        });
    } catch (error) {
        console.error("Student notices error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch notices"
        });
    }
});

module.exports = router;
