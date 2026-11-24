-- اختياري: لو بتستخدم سيرفر MySQL واحد محلي بدل Docker،
-- نفّذ هذا الملف لإنشاء قاعدتي الفرعين على نفس السيرفر (المنفذ 3306).
CREATE DATABASE IF NOT EXISTS nahda_khartoum CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS nahda_atbara CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
