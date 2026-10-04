# Digital Notice Board — Fixed Full-Stack Version

## Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: Azure SQL Database
- Authentication: express-session + bcryptjs

## Important security note
The ZIP intentionally does NOT contain your real `.env` file or database password.
Copy `.env.example` to `.env` and put your existing Azure SQL password there.

## 1. Install dependencies

Open the project folder in VS Code:

```bash
npm install
```

## 2. Configure Azure SQL

Create `.env` from `.env.example`.

Use your Azure SQL settings:

```text
PORT=3000
DB_USER=sqladmin
DB_PASSWORD=YOUR_PASSWORD
DB_SERVER=myproject-sql-server-123.database.windows.net
DB_DATABASE=myprojectdb
DB_PORT=1433
SESSION_SECRET=your_long_secret
```

Your Azure SQL firewall must allow your current public IP address.

## 3. Create/verify database tables

Open Azure SQL Query Editor for `myprojectdb`.

Run:

```text
database/schema.sql
```

The script only creates `admins` and `notices` if they do not already exist.

## 4. Create the admin account

Run:

```bash
npm run create-admin
```

Default demo credentials:

```text
Username: admin
Password: Admin@123
```

Change the password in `create-admin.js` before using this outside a college demo.

## 5. Start

```bash
npm start
```

Open:

http://localhost:3000

## 6. Health check

After the server starts:

http://localhost:3000/api/health

Expected:

```json
{"success":true,"database":"connected"}
```

## Features included

- Admin login/logout
- Azure SQL connection
- Dashboard statistics
- Active/expired status
- Pinned notices
- Search
- Category filter
- Priority filter
- Create notice
- Edit notice
- Delete notice
- Notice details
- Dark mode
- Responsive layout
- Toast notifications
- Error/empty states
- SQL schema
- Admin creation script

## Existing database

If your Azure SQL database already has the `notices` and `admins` tables, do not delete them. The backend is designed around these columns:

`notices`:
- id
- title
- description
- category
- priority
- posted_by
- created_at
- expiry_date
- is_pinned
- status

`admins`:
- id
- username
- password_hash
- name
- role


## Student Portal

The project now has a separate read-only Student Portal.

### 1. Run the database schema
Run the complete `database/schema.sql` in Azure SQL Query Editor. It safely creates the `students` table if it does not already exist.

### 2. Create the demo student
With your `.env` configured, run:

```bash
node create-student.js
```

Demo login:
- Enrollment No: `BCA001`
- Password: `Student@123`

Change these demo credentials before real deployment.

### 3. Student login
Open:

`http://localhost:3000/student-login.html`

After login, the student is redirected to:

`http://localhost:3000/student.html`

Students can:
- View active notices
- View pinned/recent notices
- Search notices
- Filter by category and priority
- Open notice details
- Logout
- Use dark mode

Students cannot add, edit, or delete notices.
