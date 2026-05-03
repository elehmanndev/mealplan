UPDATE ingredients SET supermarket = 'lidl' WHERE LOWER(name) IN
  ('pasta', 'queso rallado', 'mantequilla', 'leche', 'mozzarella');

UPDATE ingredients SET supermarket = 'mercadona' WHERE LOWER(name) IN
  ('ajo', 'calabacín', 'cebolla', 'huevos', 'limón', 'sal', 'tomate', 'patata', 'pimiento rojo', 'pimiento verde', 'lechuga');

UPDATE ingredients SET supermarket = 'bon-area' WHERE LOWER(name) IN
  ('pechuga de pollo', 'salmón', 'pollo', 'ternera picada', 'gambas', 'atún en lata');

UPDATE ingredients SET supermarket = 'aldi' WHERE LOWER(name) IN
  ('caldo de pollo', 'lentejas', 'zanahoria', 'arroz', 'garbanzos', 'pan', 'aceite de oliva', 'brócoli', 'espinacas');
