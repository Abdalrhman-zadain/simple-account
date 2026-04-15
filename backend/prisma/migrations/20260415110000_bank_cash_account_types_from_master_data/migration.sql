ALTER TABLE "BankCashAccount"
ALTER COLUMN "type" TYPE TEXT
USING CASE
  WHEN "type"::text = 'BANK' THEN 'Bank'
  WHEN "type"::text = 'CASH' THEN 'Cash'
  ELSE INITCAP(LOWER("type"::text))
END;

DROP TYPE "BankCashAccountType";
