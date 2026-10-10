ALTER TABLE "VerificationCode" DROP CONSTRAINT "VerificationCode_userEmail_fkey";
DROP TABLE "VerificationCode";

ALTER TABLE "User" DROP COLUMN "emailVerified";
