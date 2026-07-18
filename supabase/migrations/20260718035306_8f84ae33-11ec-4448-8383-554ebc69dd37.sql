UPDATE public.tour_gallery_photos AS p
SET
  content_hash = v.content_hash,
  width = v.width,
  height = v.height
FROM (VALUES
('2ac145b0-3011-4170-9138-e1897e0008fe'::uuid, 'dhash:22d1f142b0777840', 1824, 1368),
('4f03553d-7fa5-4c65-88e4-2dec0b508e05'::uuid, 'dhash:140b86d61b0d9f66', 1824, 1368),
('5d6042c3-7816-4215-aae0-f4a0c1b1933e'::uuid, 'dhash:702348c3c4b0e8d8', 1824, 1368),
('5ba60334-2c78-4392-b240-48a967661759'::uuid, 'dhash:5082c4e4c6c2c2c4', 1824, 1368),
('9517fb54-04cd-4b14-89f4-671a82622837'::uuid, 'dhash:0c0e0f0f17173f37', 1824, 1368),
('82eb53cf-3289-4bf4-b060-2ef2995328ba'::uuid, 'dhash:fff8f0f0e0c0c080', 1824, 1368),
('e94ed071-0716-46a1-b4fe-61a94d35c4d2'::uuid, 'dhash:04474f4f4f47470f', 847, 1111),
('6a8145c1-1be7-44ee-80d8-ba1df40bdf81'::uuid, 'dhash:0447474f4f4f4f4f', 847, 1111),
('edd8fe11-9a3b-4d7d-99d0-37fbb77f23c1'::uuid, 'dhash:1e1e1e1e1e1e1e1e', 847, 1111),
('8cef740f-c797-4dcb-b3e1-41229c61cb4c'::uuid, 'dhash:0103070f1f3f7fff', 847, 1111),
('713efe02-f8c3-4050-90fc-d090ab7c4ecc'::uuid, 'dhash:684cc4f0f8e8d0c0', 960, 720),
('0ba87b66-7fe1-447d-a317-7ecafcf8bb97'::uuid, 'dhash:030707070f0f1f3f', 960, 720),
('4f7c307b-909a-491c-a2ba-87d3dbdf3cdc'::uuid, 'dhash:1f3f3f3f7f7fffff', 1179, 861),
('54d99e2c-171b-48c5-8201-83ea27729534'::uuid, 'dhash:0f1f1f3f3f7f7fff', 1179, 861),
('96c1f7e7-46f9-44fb-af35-d785f4f8d7c7'::uuid, 'dhash:0f0f1f1f3f3f7f7f', 1171, 662),
('213cf057-b4b8-4d96-be75-db6557392662'::uuid, 'dhash:03070f1f3f7fffff', 1131, 553),
('cf3c9683-35b7-4666-a017-b112cdb89331'::uuid, 'dhash:071f3f7ffffefcf8', 885, 1920),
('a92542a3-9717-4b45-a23e-e740893eefe5'::uuid, 'dhash:10387c7c38101010', 1368, 1824)
) AS v(id, content_hash, width, height)
WHERE p.id = v.id;

CREATE UNIQUE INDEX IF NOT EXISTS tour_gallery_photos_content_hash_unique
ON public.tour_gallery_photos (content_hash)
WHERE content_hash IS NOT NULL;