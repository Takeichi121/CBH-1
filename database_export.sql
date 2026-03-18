-- CBH — Chann Back House Database Export
-- Grand Diamond (BK1040)
--
-- วิธีใช้:
--   1. รัน start-windows.bat ครั้งแรก (เพื่อให้ db:push สร้างตารางก่อน)
--   2. หยุด server (Ctrl+C)
--   3. import ไฟล์นี้:
--      psql -U postgres -d cbhdb -f database_export.sql
--   4. รัน start-windows.bat อีกครั้ง

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
-- DELETE first to avoid duplicates (no unique constraint on category+value)
-- ============================================
DELETE FROM dropdown_options WHERE category IN ('manager_shift', 'staff_shift_group');
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
('staff_shift_group', 'late',   'Late',   4, true);

-- ============================================
-- Borrow Branches (75 branches — BK network)
-- ============================================
INSERT INTO borrow_branches (id, name, code, is_active) VALUES 
('br_1768096176508_nqmt4b', 'AO NANG KRABI', 'BK1096', 1),
('br_1768096176396_33fzyy', 'BAAN CHART', 'BK1026', 1),
('br_1768096176483_kb17n0', 'BANGCHAK BANGKAE OB (DT)', 'BK1076', 1),
('br_1768096176511_az6w6k', 'BANGCHAK CHONBURI BY PASS OB', 'BK1098', 1),
('br_1768096176476_ctpb9o', 'BANGCHAK HANGDONG CHIANGMAI OB (DT)', 'BK1071', 1),
('br_1768096176462_tmpybv', 'BANGCHAK KANCHANAPISEK (DT)', 'BK1065', 1),
('br_1768096176433_4xhjwp', 'BANGCHAK PATTANAKARN 27 (DT)', 'BK1048', 1),
('br_1768096176477_zwiuc3', 'BANGCHAK PHAHOLYOTHIN KM25 IB (DT)', 'BK1072', 1),
('br_1768096176495_tcvnck', 'BANGCHAK PHETBURI ROAD IB (DT)', 'BK1086', 1),
('br_1768096176412_449umc', 'BANGCHAK RAMINTRA KM 6.5 (DT)', 'BK1037', 1),
('br_1768096176421_7obc0f', 'BANGCHAK RANGSIT OB (DT)', 'BK1041', 1),
('br_1768096176491_by3x72', 'BANGCHAK SARABURI KM 94 OB (DT)', 'BK1082', 1),
('br_1768096176446_z4ykcx', 'BANGCHAK SOUTH PATTAYA IB (DT)', 'BK1055', 1),
('br_1768096176493_vkpvlq', 'BANGCHAK SRIRACHA OB (DT)', 'BK1085', 1),
('br_1768096176426_uvc688', 'BANGCHAK WANGNOI OB (DT)', 'BK1045', 1),
('br_1768096176526_oxdyep', 'BANGKOK HOSPITAL', 'BK1214', 1),
('br_1768096176539_zh1jyw', 'CALTEX NGAMWONGWAN (DT)', 'BK1221', 1),
('br_1768096176444_6vzjj3', 'CALTEX PRACHANUKUN (DT)', 'BK1054', 1),
('br_1768096176524_fabt9a', 'CALTEX RANGSIT KLONG 3', 'BK1213', 1),
('br_1768096176519_svviq9', 'CP TOWER', 'BK1208', 1),
('br_1768096176471_0bmwxy', 'ESSO RAMA 2 KM 25 OB (DT)', 'BK1069', 1),
('br_1768096176448_yus3sp', 'ESSO RAMA 2 KM 35 IB (DT)', 'BK1056', 1),
('br_1768096176418_muzvji', 'GRAND DIAMOND', 'BK1040', 1),
('br_1768096176548_n22eld', 'HATYAI VILLAGE (DT)', 'BK1227', 1),
('br_1768096176469_mpwzo2', 'IMPACT MUANGTHONG', 'BK1067', 1),
('br_1768096176537_qckh4x', 'JAS GREEN VILLAGE KHUBON', 'BK1220', 1),
('br_1768096176552_pjfbnv', 'JOMTIEN BEACH PATTAYA', 'BK1233', 1),
('br_1768096176389_6xyv3h', 'JUNGCEYLON PHUKET', 'BK1016', 1),
('br_1768096176500_jrj3v4', 'LADPRAO120 (DT)', 'BK1089', 1),
('br_1768096176550_iv4xrn', 'LITTLE WALK LADKRABANG', 'BK1229', 1),
('br_1768096176406_cg91py', 'MBK 2', 'BK1034', 1),
('br_1768096176481_s5do4q', 'MONTIEN SURAWONG', 'BK1075', 1),
('br_1768096176410_5u2yep', 'MOTORWAY INBOUND', 'BK1035', 1),
('br_1768096176402_tg6xjv', 'MOTORWAY OUTBOUND', 'BK1029', 1),
('br_1768096176393_hypupx', 'NANA SQUARE', 'BK1021', 1),
('br_1768096176489_kkztcj', 'PATONG BANGLA PHUKET', 'BK1081', 1),
('br_1768096176466_196720', 'PATTAYA KLANG', 'BK1066', 1),
('br_1768096176368_mzof40', 'PATTAYA ROYAL GARDEN', 'BK1002', 1),
('br_1768096176486_8v0h6w', 'PHUKET AIRPORT 3RD FL. AIRSIDE', 'BK1077', 1),
('br_1768096176528_x5p6i8', 'PORTO GO BANG PA-IN OB (DT)', 'BK1215', 1),
('br_1768096176532_qlubx9', 'PRACHAUTHIT 45', 'BK1217', 1),
('br_1768096176451_e6rsaj', 'PTT BANGNA EXPRESSWAY OB (DT)', 'BK1057', 1),
('br_1768096176535_4ukejv', 'PTT KRUNGTHEPKRITHA OB', 'BK1219', 1),
('br_1768096176504_uiefbn', 'PTT LAMPHAYA 3 IB (DT)', 'BK1093', 1),
('br_1768096176498_n5rinx', 'PTT MABKHA RAYONG IB (DT)', 'BK1088', 1),
('br_1768096176530_97lmj4', 'PTT MAE RIM CHIANGMAI', 'BK1216', 1),
('br_1768096176514_anojj8', 'PTT PETRA', 'BK1200', 1),
('br_1768096176510_hxz7zy', 'PTT PRANOK KANCHANAPISEK IB (DT)', 'BK1097', 1),
('br_1768096176487_qqebs0', 'PTT PRANOK KANCHANAPISEK OB (DT)', 'BK1080', 1),
('br_1768096176479_1y17av', 'PTT SARABURI KM 100 IB (DT)', 'BK1073', 1),
('br_1768096176502_lhac9u', 'PTT SUWINTHAWONG IB (DT)', 'BK1092', 1),
('br_1768096176521_saim5e', 'PTT THE DEAL CHAENGWATTANA', 'BK1211', 1),
('br_1768096176533_gq8als', 'PTT WANGMANAO', 'BK1218', 1),
('br_1768096176546_dlyw15', 'QSNCC', 'BK1226', 1),
('br_1768096176544_jxyw4x', 'RATCHADA (DT)', 'BK1225', 1),
('br_1768096176497_uccupk', 'REST AREA BANGNA IB', 'BK1087', 1),
('br_1768096176415_0ykiyz', 'REST AREA PRACHACHUEN', 'BK1039', 1),
('br_1768096176424_5oj5im', 'RIVERSIDE PLAZA', 'BK1044', 1),
('br_1768096176556_htcrcb', 'S SQUARE PINKLAO (DT)', 'BK415134', 1),
('br_1768096176516_maxbzb', 'S15 SUKHUMVIT', 'BK1202', 1),
('br_1768096176541_1nxsz0', 'SAI MAI MALL', 'BK1222', 1),
('br_1768096176454_sv6u34', 'SHELL CHACHENGSAO (DT)', 'BK1058', 1),
('br_1768096176441_dnx6hb', 'SHELL CHANGWATTANA OB (DT)', 'BK1053', 1),
('br_1768096176505_2sn4z7', 'SHELL CHAOFAH WEST PHUKET', 'BK1094', 1),
('br_1768096176457_gfjuuz', 'SHELL KANCHANAPISEK KM.28 (DT)', 'BK1061', 1),
('br_1768096176459_ywmri8', 'SHELL MONTFORT CHIANGMAI (DT)', 'BK1063', 1),
('br_1768096176473_p5b0xb', 'SHELL RATCHAPRUK OB (DT)', 'BK1070', 1),
('br_1768096176522_iv4t0d', 'SHELL WESTGATE (DT)', 'BK1212', 1),
('br_1768096176517_ra9078', 'SUKHUMVIT 52 IB (DT)', 'BK1206', 1),
('br_1768096176399_ymqbi9', 'THAPAE CHIANGMAI', 'BK1028', 1),
('br_1768096176429_mqkzer', 'THE BRIGHT RAMA 2', 'BK1047', 1),
('br_1768096176542_snywbv', 'THE FOURTH PUTTHAMONTHON SAI 4', 'BK1224', 1),
('br_1768096176437_dudmo4', 'THE STREET RATCHADA', 'BK1050', 1),
('br_1768096176384_ahzmqe', 'THONG LOR', 'BK1012', 1),
('br_1768096176554_ih9ze5', 'TURTLE VILLAGE', 'BK1234', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  is_active = EXCLUDED.is_active;

-- ============================================
-- Borrow Items (105 BK standard items)
-- ============================================
INSERT INTO borrow_items (id, code, name, category, units, is_active) VALUES 
('it_1768655076955_dhkpvq', '1000033849', 'BACON-PORK COTTAGE TNT-1KG/BAG-10BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655076961_0irroc', '1000011836', 'BEEF-ANGUS XT PATTY-BK-5.5 OZ/PC-96PC/CASE-BK-R', 'General', ARRAY['PC / CASE'], 1),
('it_1768655076965_g404n6', '1000036622', 'BEEF-AUS PATTY 4.0 OZ (113G)-BK-144PC/CASE-BK-R', 'General', ARRAY['PC / CASE'], 1),
('it_1768655076969_8tspso', '1000022205', 'BEEF-AUS PATTY 4INCH-BK-288PC/CASE-BK-R', 'General', ARRAY['PC / CASE'], 1),
('it_1768655077042_vrhxai', '1000034019', 'BREAD-FRIED DOUGH STICK (PATONGO)-500G/BAG-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077191_fdxesq', '1000039540', 'BROWNIE-CUBE FROZEN-50G/PC-6PC/BAG-BK-R', 'General', ARRAY['BAG'], 1),
('it_1768655076980_2wr29r', '1000020101', 'BUN-BURGER 4 INCH-55G/PC-15PC/PACK-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655076984_0rh4uj', '1000013511', 'BUN-BURGER 5 INCH-85G/PC-8PC/PACK-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655076988_q6isug', '1000021552', 'BUN-CORN DUST 4 INCH-60G/PC-15PC/PACK-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655076992_28im8c', '1000013190', 'BUN-CRIOSSANT-65G/PC-6PC/PACK-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655076996_an0woe', '1000018000', 'BUN-HOT DOG 7 INC (CS)-75G/PC-32PC/CASE-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655076999_bd7qrz', '1000010595', 'BUN-HOTDOG 7 INCH-75G/PC-8PC/PACK-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655077003_gnytob', '1000018240', 'BUN-PARMESAN BURGER FROZEN-50G/PC-24PC/CASE-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655077064_tkewys', '1000015487', 'CHEESE-AME SLICE-FONTERRA-160SLICE/PACK-BK-R', 'General', ARRAY['PACK / CASE'], 1),
('it_1768655077067_nlq7e7', '1000015934', 'CHEESE-SWISS SLICE-BEGA-108SLICE/PACK-SWISS65%-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655077013_dl1fq8', '1000021165', 'CHICKEN-BLK SALTED-1KG/BAG-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077017_sx1mua', '1000020254', 'CHICKEN-PATTY CRISPY 60G-BK-19-21PC/BAG-14BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077021_plu53h', '1000011604', 'CHICKEN-PATTY ROYALE-BK-1.32KG/BAG-10BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077024_efgyqy', '1000016632', 'CHICKEN-PATTY SPICY GARLIC-85G/PC-6KG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077028_1mnmb6', '1000015187', 'CHICKEN-TEMPURA NUGGETS-BKP-2.268KG/BAG-8BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077031_tqyzf2', '1000011891', 'CHICKEN-THIN COATING CRISPY FRIED CUT10-BK-5PC/BAG-16BAG/CS-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077163_20umy0', '1000015651', 'CHOCOLATE-MALT POWDER-MILO-900G/BAG-BK-R', 'General', ARRAY['BAG'], 1),
('it_1768655077166_omh5n0', '1000019768', 'COFFEE BEAN-BK-250G/BAG-20BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077206_kpjhvy', '1000011064', 'CONE-DESSERT-120PC/CASE-BK-R', 'General', ARRAY['PC / CASE'], 1),
('it_1768655077194_andxop', '1000035420', 'COOKIE-BUTTER-500G/BAG-BK-R', 'General', ARRAY['BAG'], 1),
('it_1768655077169_oxhfw3', '1000010637', 'CREAMER-COFFEE MATE-3G/PC-100PC/PACK-BK-R', 'General', ARRAY['PC / PACK'], 1),
('it_1768655077006_7cqtss', '1000038711', 'DANISH-BURGER BUN-60G/PC-24PC/CASE-BK-R', 'General', ARRAY['PACK / CASE'], 1),
('it_1768655077070_edq2dy', '1000020167', 'EGG-CAGE FREE NO.2-30PC/TRAY-BK-R', 'General', ARRAY['PC / TRAY'], 1),
('it_1768655077035_k8us21', '1000038842', 'FISH-BREADED POLLOCK FILLET 150G/PC-5PC/BAG-10BG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077039_e6uq68', '1000014159', 'FISH-POLLOCK PATTY 60G-BK-40PC/BAG-5BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077009_848n9s', '1000034016', 'FLATBREAD-TORTILLA 6IN-30G/PC-12PC/PACK-BK-R', 'General', ARRAY['PACK / CASE'], 1),
('it_1768655077045_4iwbn3', '1000038424', 'FRENCH FRIES-1/4IN SHOESTRING-2.5KG/BAG-6BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077048_5tx4fe', '1000032205', 'FRENCH FRIES-1/4IN SHOESTRINGS-LW-4.5LB/BAG-6BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077051_3o3oig', '1000031187', 'HASH BROWN-13.6KG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077055_tetd2s', '1000037051', 'HASH BROWN-1KG/BAG-10BAG/CASE-CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077173_z0m2us', '1000020671', 'JUICE-ORANGE SHOGUN-TIPCO-1L/BOX-BK-R', 'General', ARRAY['BOX'], 1),
('it_1768655077177_juj3sy', '1000012094', 'MILK-PLAIN-MEIJI-2L/GAL-BK-R', 'General', ARRAY['GAL'], 1),
('it_1768655077180_txj0dn', '1000011281', 'MILK-POWDER-200G/BAG-BK-R', 'General', ARRAY['BAG'], 1),
('it_1768655077097_oco5zp', '1000022385', 'MUSHROOM SAUTEED-340G/BAG-20BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077058_bfqpkp', '1000012613', 'ONION RING-BREAD PREFORMED-908G/BAG-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077290_ynrbvc', '2000012178', 'PACKAGING-BK CHICKEN BUCKET LID-50PC/PACK-BK-R', 'General', ARRAY['PC / PACK'], 1),
('it_1768655077268_0d4kyj', '2000004955', 'PACKAGING-BK LOGO CUP 540ML-50PC/PACK-BK-R', 'General', ARRAY['PCS / PACK'], 1),
('it_1768655077294_1jrg04', '2000013833', 'PACKAGING-BK PLASTIC CUP 16OZ-1000PC/CASE-BK-R', 'General', ARRAY['PC / CASE'], 1),
('it_1768655077298_fh06wl', '2000002592', 'PACKAGING-BK PLASTIC CUP 8OZ-50PC/PACK-BK-R', 'General', ARRAY['PC / PACK'], 1),
('it_1768655077303_9rwxmn', '2000015455', 'PACKAGING-BK PLASTIC LID 8OZ W/O HOLE-50PC/PACK-BK-R', 'General', ARRAY['PC / PACK'], 1),
('it_1768655077271_0ixqsr', '2000002743', 'PACKAGING-BK SINGLE BOX 140X140XH80MM-50PC/PACK-BK-R', 'General', ARRAY['PCS / PACK / CASE'], 1),
('it_1768655077275_k2aubj', '2000029182', 'PACKAGING-HIYW APPLE PIE CARTON-200PCS/PACK-BK-R', 'General', ARRAY['PCS / PACK'], 1),
('it_1768655077278_0s8gkt', '2000029184', 'PACKAGING-HIYW LTO PIE CARTON-200PCS/PACK-BK-R', 'General', ARRAY['PCS / PACK'], 1),
('it_1768655077283_magmeb', '2000011850', 'PACKAGING-HIYW MULTI PURPOSE-900PC/CASE-BK-R', 'General', ARRAY['PCS / PACK / CASE'], 1),
('it_1768655077306_nmvsgn', '2000018075', 'PACKAGING-HIYW PAPER COLD CUP 12OZ-2000PC/CASE-BK-R', 'General', ARRAY['PACK / CASE'], 1),
('it_1768655077310_49irzw', '2000001935', 'PACKAGING-HIYW PAPER COLD CUP 16OZ-1000PC/CASE-BK-R', 'General', ARRAY['PACK / CASE'], 1),
('it_1768655077314_fsswe1', '2000007825', 'PACKAGING-HIYW PAPER COLD CUP 32OZ-600PC/CASE-BK-R', 'General', ARRAY['PACK / CASE'], 1),
('it_1768655077318_876py5', '2000002805', 'PACKAGING-HIYW PLASTIC LIDS FOR COLD CUP 12OZ-1000PC/CASE-BK-R', 'General', ARRAY['PACK / CASE'], 1),
('it_1768655077321_0ddjlx', '2000000895', 'PACKAGING-HIYW PLASTIC LIDS FOR COLD CUP 32OZ PLAIN-50PC/PACK-BK-R', 'General', ARRAY['PACK / CASE'], 1),
('it_1768655077325_muylnz', '2000021490', 'PACKAGING-HIYW PLASTIC LIDS FOR COLD CUP 32OZ-500PC/CASE-BK-R', 'General', ARRAY['PACK / CASE'], 1),
('it_1768655077286_isjkjo', '2000029183', 'PACKAGING-HIYW TARO AND CORN PIE CARTON-200PCS/PACK-BK-R', 'General', ARRAY['PCS / PACK'], 1),
('it_1768655077328_6q734z', '2000010076', 'PACKAGING-PAPER CUP 6OZ PLAIN-2000PC/CASE-BK-R', 'General', ARRAY['PACK / CASE'], 1),
('it_1768655077245_u87y0c', '2000000992', 'PACKAGING-SHOPPING BAG L 12X20INCH-100PC/PACK-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655077248_o4e6sa', '2000014157', 'PACKAGING-SHOPPING BAG M 9X18IN-100PC/PACK-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655077252_z4awdc', '2000011048', 'PACKAGING-SOS#4 BAG IMPORTED-CASE-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655077256_q62ku1', '2000020375', 'PACKAGING-SOS#6 BAG IMPORTED-CASE-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655077260_b5gxum', '2000009465', 'PACKAGING-TAKE AWAY BAG FOR DRINKS-100PC/PACK-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655077263_lc2363', '2000013315', 'PACKAGING-TAKEAWAY BAG FOR DRINKS BIO-100PC/PACK-BK-R', 'General', ARRAY['PACK'], 1),
('it_1768655077075_arnm5o', '1000015883', 'PASTE-BLACK TRUFFLE-270G/BTL-12BTL/CASE-BK-R', 'General', ARRAY['BTL / CASE'], 1),
('it_1768655077223_s555v8', '1000017339', 'PIE-APPLE FROZEN-65G/PC-24PC/CASE-BK-R', 'General', ARRAY['CASE'], 1),
('it_1768655077227_5cuq16', '1000035406', 'PIE-CHOCO BANANA FROZEN-65G/PC-24PC/CASE-BK-R', 'General', ARRAY['CASE'], 1),
('it_1768655077230_ds720h', '1000012757', 'PIE-CHOCOLATE HERSHEYS FROZEN-75G/PC-24PC/CASE-BK-R', 'General', ARRAY['CASE'], 1),
('it_1768655077234_1d2vsv', '1000037536', 'PIE-ORANGE CARAMEL FROZEN-65G/PC-24PC/CASE-BK-R', 'General', ARRAY['CASE'], 1),
('it_1768655077237_687x06', '1000010633', 'PIE-STRAWBERRY CREAM CHEESE FROZEN-75G/PC-24PC/CASE-BK-R', 'General', ARRAY['CASE'], 1),
('it_1768655077241_cuez0w', '1000017104', 'PIE-TARO AND CORN FROZEN-65G/PC-24PC/CASE-BK-R', 'General', ARRAY['CASE'], 1),
('it_1768655076973_npoimm', '1000016736', 'PORK-BALL-BK-30G/BAG-60BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655076976_hy7wza', '1000012618', 'PORK-PATTY 4IN TNT-BETAGRO-240PC/CASE-BK-R', 'General', ARRAY['PC / CASE'], 1),
('it_1768655077100_kl16ui', '1000015551', 'SAUCE-BBQ BK LOGO-20G/CUP-200CUP/CS-BK-R', 'General', ARRAY['CUP / CASE'], 1),
('it_1768655077103_vy8ap3', '1000011821', 'SAUCE-BBQ BULK-1.2KG/BAG-6BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077107_cve3zi', '1000016562', 'SAUCE-BK MAYONNAISE-1KG/BAG-10BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077110_yjkyu8', '1000011662', 'SAUCE-CHILI BK LOGO-7G/PC-300PC/CS-BK-R', 'General', ARRAY['PC / CASE'], 1),
('it_1768655077113_49z87n', '1000015360', 'SAUCE-CHILI BULK-1.2KG/BAG-10BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077209_z41yjr', '1000015424', 'SAUCE-CHOCOLATE FUDGE TNT BK-500G/BAG-BK-R', 'General', ARRAY['BAG'], 1),
('it_1768655077116_mcgd6o', '1000022272', 'SAUCE-ESAN-500G/BAG-10BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077119_gixdm2', '1000016910', 'SAUCE-MUSHROOM SAUCE WITH TRUFFLE-20BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077213_9mt56e', '1000201307', 'SAUCE-PINK RASPBERRY FLAVORED RIBBON-0.8KG/BAG-BK-R', 'General', ARRAY['BAG'], 1),
('it_1768655077216_6n8ztz', '1000020951', 'SAUCE-STRAWBERRY TOPPING TNT BK-1KG/BAG-BK-R', 'General', ARRAY['BAG'], 1),
('it_1768655077123_4s7mhf', '1000021496', 'SAUCE-TARTAR-1KG/BAG-12BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077126_57vlpr', '1000010040', 'SAUCE-TOMATO KETCHUP SACHET-SRITHAI-7G/PC-300PC/CS-BK-R', 'General', ARRAY['PC / CASE'], 1),
('it_1768655077130_hk462t', '1000019589', 'SAUCE-TOMATO KETCHUP-1KG/BAG-10BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077133_hwnixs', '1000015661', 'SEASONING-SALT-1KG/BAG-BK-R', 'General', ARRAY['KG / BAG'], 1),
('it_1768655077136_dfyx5t', '1000017297', 'SEASONING-TOM YUM SEASONING-10BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077061_x5e7aw', '1000013590', 'SHORTENING-TNT-20KG/CASE-BK-R', 'General', ARRAY['CASE'], 1),
('it_1768655077202_bk93jf', '1000016946', 'SNACK-OREO VANILLA CREAM-26.25G/BAG-12BAG/BOX-BK-R', 'General', ARRAY['BAG / BOX'], 1),
('it_1768655077143_fi7pa5', '1000008261', 'SOFT DRINK-BIB-FUZE TEA-5L/BOX-BK-R', 'General', ARRAY['BOX'], 1),
('it_1768655077146_pmsjj3', '1000020441', 'SOFT DRINK-GRAPE BIB-FANTA-10L/BOX-BK-R', 'General', ARRAY['BOX'], 1),
('it_1768655077149_1dh2vr', '1000001116', 'SOFT DRINK-NO SUGAR BIB-COKE-10L/BOX-BK-R', 'General', ARRAY['BOX'], 1),
('it_1768655077152_4mo95m', '1000007074', 'SOFT DRINK-NO SUGAR BIB-SPRITE-10L/BOX-BK-R', 'General', ARRAY['BOX'], 1),
('it_1768655077155_nfs5hp', '1000002858', 'SOFT DRINK-ORANGE BIB-MINUTE MAID-5L/BOX-BK-R', 'General', ARRAY['BOX'], 1),
('it_1768655077159_vjn7vt', '1000006290', 'SOFT DRINK-ORIGINAL BIB-COKE-20L/BOX-BK-R', 'General', ARRAY['BOX'], 1),
('it_1768655077220_9pft0r', '1000014644', 'SOFT SERVE-POWDER-1.5KG/BAG-10BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077140_kid1mq', '1000014700', 'SUGAR-WHITE-4G/SACHET-1800SACHET/CASE-BK-R', 'General', ARRAY['SACHET / CASE'], 1),
('it_1768655077184_nr5nsn', '1000000006', 'SYRUP-MITRPHOL-800ML/BAG-BK-R', 'General', ARRAY['BAG'], 1),
('it_1768655077078_gzof66', '1000015957', 'VEG DRIED-SLICE PICKLES TNT-NW725G/BAG-12BAG/CASE-BK-R', 'General', ARRAY['BAG / CASE'], 1),
('it_1768655077081_cwoaik', '1000013685', 'VEG PRECUT-LETTUCE-1KG/BAG-BK-R', 'General', ARRAY['KG / BAG'], 1),
('it_1768655077091_gmh0bf', '1000035380', 'VEG-FROZEN POTATO AND CHEESE PATTY 105G-144PC/CASE-BK-R', 'General', ARRAY['PC / CASE'], 1),
('it_1768655077094_gblhwf', '1000035381', 'VEG-FROZEN VEGGIE PATTY 65G-240PC/CASE-BK-R', 'General', ARRAY['PC / CASE'], 1),
('it_1768655077084_2p93sm', '1000033676', 'VEG-ONION PEELED-1KG/BAG-BK-R', 'General', ARRAY['KG / BAG'], 1),
('it_1768655077088_yj62x8', '1000021616', 'VEG-TOMATOES-1KG/BAG-BK-R', 'General', ARRAY['KG / BAG'], 1),
('it_1768655077188_9c7xwt', '1000000013', 'WATER-550ML/BTL-BK-R', 'General', ARRAY['BTL'], 1)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  units = EXCLUDED.units,
  is_active = EXCLUDED.is_active;

-- ============================================
-- Users (26 staff — password hash for default SALT)
-- ⚠️  ON CONFLICT DO NOTHING — existing users are preserved
-- ============================================
INSERT INTO users (username, passhash, role, full_name, nick_name, phone, email, position, active, must_change_password, created_at) VALUES 
('adisorn.n',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Adisorn Nasa',               'Tan',     '', '', 'service_staff', 1, 0, NOW()),
('admin',       'f7f0c1a88bffcf29662ce46b388dbd0df28e45599d93e0507786add9efeb5c31', 'admin',   'Admin',                      'Admin',   '0946389318', 'bk1040@minor.com', 'Admin', 1, 0, NOW()),
('arthit.s',    'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Arthit Satimai',             'Sun',     '', '', 'service_staff', 1, 0, NOW()),
('athat.n',     'edb5082d661d95ec5a49a9dda50952f7308f42c10bd3b5c67451d2956b10c841', 'staff',   'Athat Naknava',              'Guitar',  '0641644816', 'a.tuch4816@gmail.com', 'service_staff', 1, 0, NOW()),
('bookon001',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'manager', 'Booyisa Kongboon',           'Yo',      '0942514948', 'bunyisak70@gmail.com', 'assistant_store_manager', 1, 0, NOW()),
('chajai001',   'cebe4719435954fba994ef266cfeb1c4a552bcab022e6a4f90d62402fa83083b', 'manager', 'Chanon Jaimool',             'Ake',     '0946389318', 'meta0012@gmail.com', 'shift_manager', 1, 0, NOW()),
('chajai003',   '7af0abf01ebd74bb919247674a2adf7042d5cfb9a7a7c34f3b020ef39346c437', 'admin',   'Chanon Jaimool',             'Ake',     '0946389318', 'meta0012@gmail.com', '', 1, 0, NOW()),
('devstaff',    '03e9ba4a5acaed1d341e511e5d20f3c7a2911917ede951335cbd6e8212cef9bb', 'staff',   'Developer Mode',             'Dev',     '', '', 'Developer', 1, 0, NOW()),
('kanapat.m',   '66846502b85c320cedb3343886c0e3caf4118ef2376821f1eabbbfc9bdf00aef', 'staff',   'Kanapat Muangmatcha',        'Bank',    '0845076738', 'khunphathn37@gmail.com', 'service_staff', 1, 0, NOW()),
('kidsada.b',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Kidsada Butdahand',          'Dew',     '0939246093', 'yusonanii@gmail.com', 'service_staff', 1, 0, NOW()),
('manager',     'f7f0c1a88bffcf29662ce46b388dbd0df28e45599d93e0507786add9efeb5c31', 'manager', 'Manager',                    'Developer','0946389318', 'bk1040@minorfood.com', 'store_manager', 1, 0, NOW()),
('nattarika.j', 'bc45afe0f12789d36c4db4820fa4e38162d393e85c1c59ae2f021ae682cffc7b', 'staff',   'Nattarika Jongpakdee',       'Jane',    '0895096757', 'pakdee.jen11@gmail.com', 'service_staff', 1, 0, NOW()),
('nutkae001',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'manager', 'Nuttarika Kaewkham',         'Jeew',    '', '', 'shift_manager', 1, 0, NOW()),
('paisit.k',    '58b8bede162709939afe29938082d8e2af21b912159a09e26b2ee930c6b1140d', 'staff',   'Paisit Kosaisuk',            'M',       '0614050827', 'mslazkung51@gmail.com', 'service_staff', 1, 0, NOW()),
('phopho002',   'f7f0c1a88bffcf29662ce46b388dbd0df28e45599d93e0507786add9efeb5c31', 'manager', 'Phongsathon Phoreung',       'Night',   '0909048080', 'bk1040@minorfood.com', 'store_manager', 1, 0, NOW()),
('phusanisa.k', 'e5203bbd6bc89f62b2b05d28b645feafbc7a65f587af61598e0e12cf96d703a5', 'staff',   'Phusanisa Khonghom',         'Winnie',  '0877204459', 'phu.10march@gmail.com', 'service_staff', 1, 0, NOW()),
('pitkon001',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Pitak Kongsin',              'Typoon',  '0807061908', 'Pituk.kongsin2549@gmail.com', 'service_staff', 1, 0, NOW()),
('ponsae001',   'f7a2b77e760ba0b8c58716296438aaf761c5cbbce9be22dbd3fa326c2030599e', 'staff',   'Pongphat Saengrakkrongsiri', 'Geng',    '0985012382', 'skrobinson2382@gmail.com', 'service_staff', 1, 0, NOW()),
('pornnipa.n',  'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Pornnipa Nonsila',           'Aye',     '', '', 'service_staff', 1, 0, NOW()),
('sarawut.k',   'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Sarawut Kengkaj',            'Nat',     '', 'netkung168@gmail.com', 'service_staff', 1, 0, NOW()),
('staff',       'f7f0c1a88bffcf29662ce46b388dbd0df28e45599d93e0507786add9efeb5c31', 'staff',   'Staff',                      'Staff Developer', '-', 'meta0012@gmail.com', 'service_staff', 1, 0, NOW()),
('sunaree.m',   '55dbb2f6f7e56dccb53da9eabad9ea657fbc7fd984a2bc2d0a3227f78a86f421', 'staff',   'Sunaree Moungkroun',         'Na',      '0927839639', 'sriphasunari7@gmail.com', 'service_staff', 1, 0, NOW()),
('thepthakun.s','a4605e1d98e9d40cd087078a4d4d9823cd790756c4ccda538d58b9ac02ee30a0', 'staff',   'Thepthakun Saesong',         'Thep',    '0935920947', 'thethakur@gmail.com', 'service_staff', 1, 0, NOW()),
('wafah.p',     'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Wafah Promchuai',            'Wawa',    '', '', 'service_staff', 1, 0, NOW()),
('wasson001',   '10d01140f12b85924566c8fbd3074ca8040b9afaa654efd34511c7b0df1dfa27', 'manager', 'Washiraphan Na Songkhla',    'World',   '0811575838', 'Washiraphan.sk@gmail.com', 'management_trainee', 1, 0, NOW()),
('yossanan.t',  'f034adaedae163632cce7ef39aea44a3581a86af5785d0f676b15b97490c3264', 'staff',   'Yossanan Tiyasuksawad',      'Leo',     '', '', 'service_staff', 1, 0, NOW())
ON CONFLICT (username) DO NOTHING;

-- ============================================
SELECT 'CBH import OK: config, labor_settings, store_settings, dropdown_options, 75 branches, 105 items, 26 users.' as status;
