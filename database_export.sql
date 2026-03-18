-- CBH — Chann Back House Database Export
-- Grand Diamond (BK1040)
-- Run AFTER first start (so db:push creates tables first):
--   psql -U postgres -d cbhdb -f database_export.sql

-- ============================================
-- Config settings (system config)
-- ============================================
INSERT INTO config (key, value, updated_at) VALUES 
('cap_open', '2', NOW()),
('cap_swing', '2', NOW()),
('cap_lunch', '2', NOW()),
('cap_dinner', '3', NOW()),
('cap_close', '2', NOW()),
('cap_late', '2', NOW()),
('lock_time_period', 'true', NOW()),
('maintenance_enabled', 'false', NOW()),
('maintenance_start_day', '2', NOW()),
('maintenance_start_time', '23:00', NOW()),
('maintenance_end_day', '4', NOW()),
('maintenance_end_time', '00:00', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;

-- ============================================
-- Labor settings
-- ============================================
INSERT INTO labor_settings (id, roster_hours, duty_daily_hours, fixed_cost_daily, close_shift_daily_cost, pt_wage_rate) VALUES 
(1, 88.00, 40.00, 4225.00, 50.00, 50.00)
ON CONFLICT (id) DO UPDATE SET 
  roster_hours = EXCLUDED.roster_hours,
  duty_daily_hours = EXCLUDED.duty_daily_hours,
  fixed_cost_daily = EXCLUDED.fixed_cost_daily,
  close_shift_daily_cost = EXCLUDED.close_shift_daily_cost,
  pt_wage_rate = EXCLUDED.pt_wage_rate;

-- ============================================
-- Store settings
-- ============================================
INSERT INTO store_settings (id, store_name, store_code, daily_target, mtd_target, created_at, updated_at) VALUES 
(1, 'Grand Diamond', 'BK1040', '110000', '3300000', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  store_name = EXCLUDED.store_name,
  store_code = EXCLUDED.store_code,
  daily_target = EXCLUDED.daily_target,
  mtd_target = EXCLUDED.mtd_target,
  updated_at = NOW();

-- ============================================
-- Dropdown options (shift groups, manager slots, etc.)
-- ============================================
INSERT INTO dropdown_options (category, value, label, sort_order, is_active) VALUES 
('manager_shift', 'open',   'Open (07:00-16:00)',   1, true),
('manager_shift', 'lunch',  'Lunch (10:00-19:00)',   2, true),
('manager_shift', 'mid',    'Mid (13:00-22:00)',     3, true),
('manager_shift', 'late',   'Late (15:00-00:00)',    4, true),
('manager_shift', 'close',  'Close (22:00-07:00)',   5, true),
('manager_shift', 'off',    'OFF',                   6, true),
('manager_shift', 'com',    'COM (วันชดเชย)',        7, true),
('staff_shift_group', 'open',   'Open',   1, true),
('staff_shift_group', 'lunch',  'Lunch',  2, true),
('staff_shift_group', 'dinner', 'Dinner', 3, true),
('staff_shift_group', 'late',   'Late',   4, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Users (all staff — password default: "1234")
-- Hash = SHA-256 of (SALT + password) using default SALT
-- Default passhash below matches SALT="my-super-secret-salt-change-this" + password="1234"
-- ⚠️  After changing SALT in .env, reset all passwords via Admin panel
-- ============================================
INSERT INTO users (username, passhash, role, full_name, nick_name, phone, email, position, active, must_change_password, created_at) VALUES 
('adisorn.n',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Adisorn Nasa',              'Tan',     '', '', 'service_staff', 1, 0, NOW()),
('admin',       'f7f0c1a88bffcf29662ce46b388dbd0df28e45599d93e0507786add9efeb5c31', 'admin',   'Admin',                     'Admin',   '0946389318', 'bk1040@minor.com', 'Admin', 1, 0, NOW()),
('arthit.s',    'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Arthit Satimai',            'Sun',     '', '', 'service_staff', 1, 0, NOW()),
('athat.n',     'edb5082d661d95ec5a49a9dda50952f7308f42c10bd3b5c67451d2956b10c841', 'staff',   'Athat Naknava',             'Guitar',  '0641644816', 'a.tuch4816@gmail.com', 'service_staff', 1, 0, NOW()),
('bookon001',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'manager', 'Booyisa Kongboon',          'Yo',      '0942514948', 'bunyisak70@gmail.com', 'assistant_store_manager', 1, 0, NOW()),
('chajai001',   'cebe4719435954fba994ef266cfeb1c4a552bcab022e6a4f90d62402fa83083b', 'manager', 'Chanon Jaimool',            'Ake',     '0946389318', 'meta0012@gmail.com', 'shift_manager', 1, 0, NOW()),
('chajai003',   '7af0abf01ebd74bb919247674a2adf7042d5cfb9a7a7c34f3b020ef39346c437', 'admin',   'Chanon Jaimool',            'Ake',     '0946389318', 'meta0012@gmail.com', '', 1, 0, NOW()),
('devstaff',    '03e9ba4a5acaed1d341e511e5d20f3c7a2911917ede951335cbd6e8212cef9bb', 'staff',   'Developer Mode',            'Dev',     '', '', 'Developer', 1, 0, NOW()),
('kanapat.m',   '66846502b85c320cedb3343886c0e3caf4118ef2376821f1eabbbfc9bdf00aef', 'staff',   'Kanapat Muangmatcha',       'Bank',    '0845076738', 'khunphathn37@gmail.com', 'service_staff', 1, 0, NOW()),
('kidsada.b',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Kidsada Butdahand',         'Dew',     '0939246093', 'yusonanii@gmail.com', 'service_staff', 1, 0, NOW()),
('manager',     'f7f0c1a88bffcf29662ce46b388dbd0df28e45599d93e0507786add9efeb5c31', 'manager', 'Manager',                   'Developer','0946389318', 'bk1040@minorfood.com', 'store_manager', 1, 0, NOW()),
('nattarika.j', 'bc45afe0f12789d36c4db4820fa4e38162d393e85c1c59ae2f021ae682cffc7b', 'staff',   'Nattarika Jongpakdee',      'Jane',    '0895096757', 'pakdee.jen11@gmail.com', 'service_staff', 1, 0, NOW()),
('nutkae001',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'manager', 'Nuttarika Kaewkham',        'Jeew',    '', '', 'shift_manager', 1, 0, NOW()),
('paisit.k',    '58b8bede162709939afe29938082d8e2af21b912159a09e26b2ee930c6b1140d', 'staff',   'Paisit Kosaisuk',           'M',       '0614050827', 'mslazkung51@gmail.com', 'service_staff', 1, 0, NOW()),
('phopho002',   'f7f0c1a88bffcf29662ce46b388dbd0df28e45599d93e0507786add9efeb5c31', 'manager', 'Phongsathon Phoreung',      'Night',   '0909048080', 'bk1040@minorfood.com', 'store_manager', 1, 0, NOW()),
('phusanisa.k', 'e5203bbd6bc89f62b2b05d28b645feafbc7a65f587af61598e0e12cf96d703a5', 'staff',   'Phusanisa Khonghom',        'Winnie',  '0877204459', 'phu.10march@gmail.com', 'service_staff', 1, 0, NOW()),
('pitkon001',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Pitak Kongsin',             'Typoon',  '0807061908', 'Pituk.kongsin2549@gmail.com', 'service_staff', 1, 0, NOW()),
('ponsae001',   'f7a2b77e760ba0b8c58716296438aaf761c5cbbce9be22dbd3fa326c2030599e', 'staff',   'Pongphat Saengrakkrongsiri','Geng',    '0985012382', 'skrobinson2382@gmail.com', 'service_staff', 1, 0, NOW()),
('pornnipa.n',  'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Pornnipa Nonsila',          'Aye',     '', '', 'service_staff', 1, 0, NOW()),
('sarawut.k',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Sarawut Kengkaj',           'Nat',     '', 'netkung168@gmail.com', 'service_staff', 1, 0, NOW()),
('staff',       'f7f0c1a88bffcf29662ce46b388dbd0df28e45599d93e0507786add9efeb5c31', 'staff',   'Staff',                     'Staff Developer', '-', 'meta0012@gmail.com', 'service_staff', 1, 0, NOW()),
('sunaree.m',   '55dbb2f6f7e56dccb53da9eabad9ea657fbc7fd984a2bc2d0a3227f78a86f421', 'staff',   'Sunaree Moungkroun',        'Na',      '0927839639', 'sriphasunari7@gmail.com', 'service_staff', 1, 0, NOW()),
('thepthakun.s','a4605e1d98e9d40cd087078a4d4d9823cd790756c4ccda538d58b9ac02ee30a0', 'staff',   'Thepthakun Saesong',        'Thep',    '0935920947', 'thethakur@gmail.com', 'service_staff', 1, 0, NOW()),
('wafah.p',     'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Wafah Promchuai',           'Wawa',    '', '', 'service_staff', 1, 0, NOW()),
('wasson001',   '10d01140f12b85924566c8fbd3074ca8040b9afaa654efd34511c7b0df1dfa27', 'manager', 'Washiraphan Na Songkhla',   'World',   '0811575838', 'Washiraphan.sk@gmail.com', 'management_trainee', 1, 0, NOW()),
('yossanan.t',  'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Yossanan Tiyasuksawad',     'Leo',     '', '', 'service_staff', 1, 0, NOW())
ON CONFLICT (username) DO NOTHING;

-- ============================================
SELECT 'CBH database import completed! 26 users, config, labor_settings, store_settings, dropdown_options imported.' as status;
