USE myprojectdb;
GO

IF OBJECT_ID('dbo.admins', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.admins (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        role NVARCHAR(30) NOT NULL DEFAULT 'admin'
    );
END;
GO

IF OBJECT_ID('dbo.notices', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.notices (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        category NVARCHAR(50) NOT NULL,
        priority NVARCHAR(20) NOT NULL DEFAULT 'Normal',
        posted_by NVARCHAR(100) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        expiry_date DATE NULL,
        is_pinned BIT NOT NULL DEFAULT 0,
        status NVARCHAR(20) NOT NULL DEFAULT 'Active'
    );
END;
GO

-- Helpful indexes
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_notices_status_created'
      AND object_id = OBJECT_ID('dbo.notices')
)
BEGIN
    CREATE INDEX IX_notices_status_created
    ON dbo.notices(status, created_at DESC);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_notices_category'
      AND object_id = OBJECT_ID('dbo.notices')
)
BEGIN
    CREATE INDEX IX_notices_category
    ON dbo.notices(category);
END;
GO

GO

IF OBJECT_ID('dbo.students', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.students (
        id INT IDENTITY(1,1) PRIMARY KEY,
        enrollment_no NVARCHAR(50) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        course NVARCHAR(100) NULL,
        year NVARCHAR(30) NULL,
        email NVARCHAR(150) NULL,
        is_active BIT NOT NULL DEFAULT 1
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_students_enrollment'
      AND object_id = OBJECT_ID('dbo.students')
)
BEGIN
    CREATE INDEX IX_students_enrollment
    ON dbo.students(enrollment_no);
END;
GO
