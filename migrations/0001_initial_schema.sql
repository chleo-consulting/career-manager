-- Expériences professionnelles
CREATE TABLE IF NOT EXISTS experiences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_current INTEGER DEFAULT 0,
  description TEXT,
  achievements TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Compétences et technologies
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Relation entre expériences et compétences
CREATE TABLE IF NOT EXISTS experience_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experience_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  proficiency_level TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE(experience_id, skill_id)
);

-- Documents associés aux expériences
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experience_id INTEGER,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  r2_key TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE SET NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_experiences_dates ON experiences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_experience_skills_exp ON experience_skills(experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_skills_skill ON experience_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_documents_experience ON documents(experience_id);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
