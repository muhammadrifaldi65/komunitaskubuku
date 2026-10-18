BEGIN;
LOCK TABLE "User" IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT lower("username") FROM "User" GROUP BY lower("username") HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Case-insensitive username collisions exist. Resolve explicitly before migrating.';
  END IF;
  IF EXISTS (SELECT 1 FROM "User" WHERE "username" !~ '^[a-zA-Z0-9_][a-zA-Z0-9_.]{2,23}$' OR lower("username") IN ('admin','api','auth','bookmarks','create','login','logout','media','messages','notifications','post','profile','reading-list','register','search','settings','support','verify','_next','favicon.ico','robots.txt','sitemap.xml')) THEN
    RAISE EXCEPTION 'Reserved or invalid usernames exist. Choose explicit replacement usernames before migrating; no accounts are renamed automatically.';
  END IF;
END $$;
ALTER TABLE "User" ADD COLUMN "coverUrl" TEXT, ADD COLUMN "location" VARCHAR(100), ADD COLUMN "website" VARCHAR(500);
CREATE UNIQUE INDEX "User_username_lower_key" ON "User" (lower("username"));
ALTER TABLE "User" ADD CONSTRAINT "User_username_valid" CHECK ("username" ~ '^[a-zA-Z0-9_][a-zA-Z0-9_.]{2,23}$' AND lower("username") NOT IN ('admin','api','auth','bookmarks','create','login','logout','media','messages','notifications','post','profile','reading-list','register','search','settings','support','verify','_next','favicon.ico','robots.txt','sitemap.xml'));
UPDATE "Notification" SET "link" = regexp_replace("link", '^/profile/', '/') WHERE "link" LIKE '/profile/%';
COMMIT;
