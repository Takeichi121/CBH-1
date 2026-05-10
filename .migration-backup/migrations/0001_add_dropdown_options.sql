CREATE TABLE IF NOT EXISTS "dropdown_options" (
  "id" serial PRIMARY KEY NOT NULL,
  "category" text NOT NULL,
  "value" text NOT NULL,
  "label" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL
);

INSERT INTO "dropdown_options" ("category", "value", "label", "sort_order", "is_active")
SELECT * FROM (VALUES
  ('manager_shift', '07:00-16:00', '07:00-16:00', 0, true),
  ('manager_shift', '09:00-18:00', '09:00-18:00', 1, true),
  ('manager_shift', '10:00-19:00', '10:00-19:00', 2, true),
  ('manager_shift', '11:00-20:00', '11:00-20:00', 3, true),
  ('manager_shift', '12:00-21:00', '12:00-21:00', 4, true),
  ('manager_shift', '13:00-22:00', '13:00-22:00', 5, true),
  ('manager_shift', '14:00-23:00', '14:00-23:00', 6, true),
  ('manager_shift', '15:00-00:00', '15:00-00:00', 7, true),
  ('manager_shift', '16:00-01:00', '16:00-01:00', 8, true),
  ('manager_shift', '19:00-04:00', '19:00-04:00', 9, true),
  ('manager_shift', '22:00-07:00', '22:00-07:00', 10, true),
  ('manager_shift', 'OFF', 'OFF', 11, true),
  ('manager_shift', 'SICK', 'SICK', 12, true),
  ('manager_shift', 'COM', 'COM', 13, true),
  ('manager_shift', 'Vacation', 'Vacation', 14, true),
  ('manager_shift', 'QSNCC', 'QSNCC', 15, true),
  ('manager_shift', 'Training', 'Training', 16, true),
  ('staff_shift', '07:00-16:00', '07:00-16:00', 0, true),
  ('staff_shift', '09:00-18:00', '09:00-18:00', 1, true),
  ('staff_shift', '10:00-19:00', '10:00-19:00', 2, true),
  ('staff_shift', '11:00-20:00', '11:00-20:00', 3, true),
  ('staff_shift', '12:00-21:00', '12:00-21:00', 4, true),
  ('staff_shift', '13:00-22:00', '13:00-22:00', 5, true),
  ('staff_shift', '14:00-23:00', '14:00-23:00', 6, true),
  ('staff_shift', '15:00-00:00', '15:00-00:00', 7, true),
  ('staff_shift', '18:00-00:00', '18:00-00:00', 8, true),
  ('staff_shift', '19:00-04:00', '19:00-04:00', 9, true),
  ('staff_shift', '21:00-06:00', '21:00-06:00', 10, true),
  ('staff_shift', '22:00-07:00', '22:00-07:00', 11, true),
  ('staff_shift', 'CUSTOM', 'กำหนดเอง', 12, true)
) AS seed("category", "value", "label", "sort_order", "is_active")
WHERE NOT EXISTS (SELECT 1 FROM "dropdown_options" LIMIT 1);