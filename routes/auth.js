const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

router.post("/login", async (req, res) => {
    try {
        const db = req.app.get("db");
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        const result = await db.request()
            .input("username", username)
            .query(`
                SELECT id, username, password_hash, name, role
                FROM admins
                WHERE username = @username
            `);

        if (!result.recordset.length) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const admin = result.recordset[0];
        const validPassword = await bcrypt.compare(password, admin.password_hash);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        req.session.admin = {
            id: admin.id,
            username: admin.username,
            name: admin.name,
            role: admin.role
        };

        res.json({
            success: true,
            message: "Login successful",
            admin: req.session.admin
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

router.get("/me", (req, res) => {
    if (!req.session.admin) {
        return res.status(401).json({
            success: false,
            message: "Not logged in"
        });
    }

    res.json({
        success: true,
        admin: req.session.admin
    });
});

router.post("/logout", (req, res) => {
    req.session.destroy(error => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: "Logout failed"
            });
        }

        res.clearCookie("connect.sid");
        res.json({
            success: true,
            message: "Logged out successfully"
        });
    });
});

// ---------------- STUDENT AUTHENTICATION ----------------

router.post("/student-login", async (req, res) => {
    try {
        const db = req.app.get("db");
        const { enrollment_no, password } = req.body;

        if (!enrollment_no || !password) {
            return res.status(400).json({
                success: false,
                message: "Enrollment number and password are required"
            });
        }

        const result = await db.request()
            .input("enrollment_no", enrollment_no.trim())
            .query(`
                SELECT id, enrollment_no, password_hash, name, course, year, email, is_active
                FROM students
                WHERE enrollment_no = @enrollment_no
            `);

        if (!result.recordset.length) {
            return res.status(401).json({
                success: false,
                message: "Invalid enrollment number or password"
            });
        }

        const student = result.recordset[0];

        if (!student.is_active) {
            return res.status(403).json({
                success: false,
                message: "This student account is inactive"
            });
        }

        const validPassword = await bcrypt.compare(password, student.password_hash);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid enrollment number or password"
            });
        }

        req.session.student = {
            id: student.id,
            enrollment_no: student.enrollment_no,
            name: student.name,
            course: student.course,
            year: student.year,
            email: student.email
        };

        res.json({
            success: true,
            message: "Student login successful",
            student: req.session.student
        });
    } catch (error) {
        console.error("Student login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

router.get("/student-me", (req, res) => {
    if (!req.session.student) {
        return res.status(401).json({
            success: false,
            message: "Student not logged in"
        });
    }

    res.json({
        success: true,
        student: req.session.student
    });
});

router.post("/student-logout", (req, res) => {
    delete req.session.student;
    res.json({
        success: true,
        message: "Student logged out successfully"
    });
});

module.exports = router;
