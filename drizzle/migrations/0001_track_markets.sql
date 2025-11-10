ALTER TABLE "markets"
ADD COLUMN "is_tracked" boolean DEFAULT false NOT NULL;

UPDATE "markets"
SET "is_tracked" = true
WHERE "unique_key" IN (
  '0x1947267c49c3629c5ed59c88c411e8cf28c4d2afdb5da046dc8e3846a4761794',
  '0x1cfe584af3db05c7f39d60e458a87a8b2f6b5d8c6125631984ec489f1d13553b',
  '0xb8ae474af3b91c8143303723618b31683b52e9c86566aa54c06f0bc27906bcae'
);
