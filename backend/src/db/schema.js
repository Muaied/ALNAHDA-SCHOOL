'use strict';

// ============================================================
// تعريف الجداول - تُنشأ نفس البنية على كل عقدة
//
// branches  : جدول "الكتالوج العام" - نسخة منه موجودة في كل العقد
//             حتى يعرف النظام أي عقدة تملك بيانات أي فرع.
// بقية الجداول: مجزأة أفقياً (Horizontal Fragmentation)
//             بيانات كل فرع تعيش فقط في عقدته.
// المعرفات UUID نصية حتى لا تتعارض المفاتيح بين العقد المستقلة.
// ============================================================
const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(60) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    role ENUM('admin','branch_manager','registrar') NOT NULL,
    branch_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    city VARCHAR(120) DEFAULT '',
    node_key VARCHAR(1) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS teachers (
    id CHAR(36) PRIMARY KEY,
    branch_id INT NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    subject VARCHAR(80) DEFAULT '',
    phone VARCHAR(40) DEFAULT '',
    hire_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_branch (branch_id),
    CONSTRAINT fk_teacher_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS classes (
    id CHAR(36) PRIMARY KEY,
    branch_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    grade_level VARCHAR(60) DEFAULT '',
    teacher_id CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_branch (branch_id),
    CONSTRAINT fk_class_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT fk_class_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS students (
    id CHAR(36) PRIMARY KEY,
    branch_id INT NOT NULL,
    class_id CHAR(36) NULL,
    full_name VARCHAR(160) NOT NULL,
    gender VARCHAR(10) DEFAULT '',
    grade_level VARCHAR(60) DEFAULT '',
    guardian_name VARCHAR(160) DEFAULT '',
    guardian_phone VARCHAR(255) DEFAULT '',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_branch (branch_id),
    CONSTRAINT fk_student_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT fk_student_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS grades (
    id CHAR(36) PRIMARY KEY,
    student_id CHAR(36) NOT NULL,
    subject VARCHAR(80) NOT NULL,
    term VARCHAR(60) DEFAULT 'الفصل الأول',
    score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student (student_id),
    CONSTRAINT fk_grade_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS attendance (
    id CHAR(36) PRIMARY KEY,
    student_id CHAR(36) NOT NULL,
    att_date DATE NOT NULL,
    status ENUM('present','absent','late') NOT NULL DEFAULT 'present',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_date (student_id, att_date),
    CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const DEFAULT_BRANCHES = [
  { name: 'فرع الخرطوم', city: 'الخرطوم', node_key: 'A' },
  { name: 'فرع عطبرة', city: 'عطبرة', node_key: 'B' },
];

module.exports = { TABLES, DEFAULT_BRANCHES };
