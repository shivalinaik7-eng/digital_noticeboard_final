require("dotenv").config();

const sql = require("mssql");
const bcrypt = require("bcryptjs");

async function createOrUpdateStudent() {
    // Demo student credentials. Change these before real deployment.
    const enrollmentNo = "BCA001";
    const password = "Student@123";
    const name = "Demo Student";
    const course = "BCA";
    const year = "TYBCA";
    const email = "student@example.com";

    const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        port: Number(process.env.DB_PORT || 1433),
        options: {
            encrypt: true,
            trustServerCertificate: false
        }
    };

    let pool;

    try {
        pool = await sql.connect(config);
        const passwordHash = await bcrypt.hash(password, 12);

        await pool.request()
            .input("enrollment_no", sql.NVarChar(50), enrollmentNo)
            .input("password_hash", sql.NVarChar(255), passwordHash)
            .input("name", sql.NVarChar(100), name)
            .input("course", sql.NVarChar(100), course)
            .input("year", sql.NVarChar(30), year)
            .input("email", sql.NVarChar(150), email)
            .query(`
                IF EXISTS (SELECT 1 FROM students WHERE enrollment_no = @enrollment_no)
                BEGIN
                    UPDATE students
                    SET password_hash = @password_hash,
                        name = @name,
                        course = @course,
                        year = @year,
                        email = @email,
                        is_active = 1
                    WHERE enrollment_no = @enrollment_no
                END
                ELSE
                BEGIN
                    INSERT INTO students
                    (enrollment_no, password_hash, name, course, year, email)
                    VALUES
                    (@enrollment_no, @password_hash, @name, @course, @year, @email)
                END
            `);

        console.log("Student account is ready.");
        console.log("Enrollment No: BCA001");
        console.log("Password: Student@123");
    } catch (error) {
        console.error("Error creating student:", error);
        process.exitCode = 1;
    } finally {
        if (pool) await pool.close();
    }
}

createOrUpdateStudent();
