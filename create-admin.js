require("dotenv").config();

const sql = require("mssql");
const bcrypt = require("bcryptjs");

async function createOrUpdateAdmin() {
    const username = "admin";
    const password = "Admin@123";
    const name = "Administrator";
    const role = "admin";

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
            .input("username", sql.NVarChar(50), username)
            .input("password_hash", sql.NVarChar(255), passwordHash)
            .input("name", sql.NVarChar(100), name)
            .input("role", sql.NVarChar(30), role)
            .query(`
                IF EXISTS (SELECT 1 FROM admins WHERE username = @username)
                BEGIN
                    UPDATE admins
                    SET password_hash = @password_hash,
                        name = @name,
                        role = @role
                    WHERE username = @username
                END
                ELSE
                BEGIN
                    INSERT INTO admins (username, password_hash, name, role)
                    VALUES (@username, @password_hash, @name, @role)
                END
            `);

        console.log("Admin account is ready.");
        console.log("Username: admin");
        console.log("Password: Admin@123");
    } catch (error) {
        console.error("Error creating admin:", error);
        process.exitCode = 1;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

createOrUpdateAdmin();
