CREATE OR REPLACE FUNCTION "enforce_account_posting_leaf"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    parent_name TEXT;
    parent_is_posting BOOLEAN;
BEGIN
    IF NEW."parentAccountId" IS NOT NULL THEN
        SELECT "name", "isPosting"
        INTO parent_name, parent_is_posting
        FROM "Account"
        WHERE "id" = NEW."parentAccountId";

        IF parent_is_posting THEN
            RAISE EXCEPTION 'account_posting_leaf: Posting account "%" cannot have child accounts.', parent_name
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW."isPosting" AND EXISTS (
        SELECT 1
        FROM "Account" child
        WHERE child."parentAccountId" = NEW."id"
    ) THEN
        RAISE EXCEPTION 'account_posting_leaf: Posting accounts must be leaf nodes and cannot have child accounts.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "account_posting_leaf_guard" ON "Account";

CREATE TRIGGER "account_posting_leaf_guard"
BEFORE INSERT OR UPDATE OF "parentAccountId", "isPosting"
ON "Account"
FOR EACH ROW
EXECUTE FUNCTION "enforce_account_posting_leaf"();
