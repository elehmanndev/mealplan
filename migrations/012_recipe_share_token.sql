-- Add a per-recipe shareable token. Owner of the recipe can flip sharing
-- on/off; when on, /r/<token> renders the recipe read-only without auth.
-- A null token = sharing disabled (default). Recreating a token after
-- disable rotates the URL — previous link stops working.

ALTER TABLE recipes ADD COLUMN share_token TEXT;
CREATE UNIQUE INDEX idx_recipes_share_token ON recipes(share_token) WHERE share_token IS NOT NULL;
