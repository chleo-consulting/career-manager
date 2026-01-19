-- Insérer quelques compétences de base depuis le CV
INSERT OR IGNORE INTO skills (name, category) VALUES 
  -- Techniques
  ('SAP', 'ERP & Data Platforms'),
  ('GCP', 'Cloud'),
  ('BigQuery', 'Database'),
  ('Python', 'Programming'),
  ('SQL', 'Database'),
  ('PowerBI', 'Data Visualization'),
  ('Tableau', 'Data Visualization'),
  ('Git', 'DevOps'),
  ('Docker', 'DevOps'),
  ('Flask', 'Web Framework'),
  ('Django', 'Web Framework'),
  ('Streamlit', 'Web Framework'),
  ('REST API', 'API'),
  ('ChatGPT', 'AI/ML'),
  
  -- Fonctionnelles
  ('Portfolio Risk', 'Finance'),
  ('Asset Management', 'Finance'),
  ('Dérivés actions', 'Finance'),
  ('Bâle III', 'Réglementaire'),
  ('FRTB', 'Réglementaire'),
  ('Reporting réglementaire', 'Réglementaire'),
  ('DataOps', 'Data Engineering'),
  ('Modern Data Stack', 'Data Engineering'),
  
  -- Méthodologies
  ('Scrum', 'Agile'),
  ('Product Management', 'Management'),
  ('Data Architecture', 'Architecture');

-- Insérer une expérience d'exemple (la plus récente)
INSERT INTO experiences (company, position, location, start_date, end_date, is_current, description, achievements)
VALUES (
  'SilenceSilence.ai',
  'Consultant Analyse IA',
  'France',
  '2025-07-01',
  '2025-12-31',
  0,
  'Mission de conseil en intelligence artificielle pour améliorer la productivité',
  'Analyse de différents cas d''usage IA pour booster la productivité
Veille technologique sur le multi-agent, MCP, etc.'
);

-- Lier les compétences à l'expérience exemple
INSERT INTO experience_skills (experience_id, skill_id, proficiency_level)
SELECT 1, id, 'Expert' FROM skills WHERE name IN ('ChatGPT', 'Python', 'AI/ML');
