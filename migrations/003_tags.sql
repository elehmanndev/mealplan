CREATE TABLE recipe_tags (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (recipe_id, tag)
);

CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag);

INSERT INTO recipe_tags (recipe_id, tag)
  SELECT id, 'Pasta' FROM recipes WHERE category = 'pasta';
INSERT INTO recipe_tags (recipe_id, tag)
  SELECT id, 'Ensaladas' FROM recipes WHERE category = 'ensalada';
