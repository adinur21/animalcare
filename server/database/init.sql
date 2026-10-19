CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  scientific_name VARCHAR(200),
  category VARCHAR(50) NOT NULL,
  habitat VARCHAR(150),
  diet VARCHAR(100),
  gender VARCHAR(30),
  age_years NUMERIC(5,2),
  weight_kg NUMERIC(8,2),
  origin VARCHAR(200),
  conservation_status VARCHAR(100),
  description TEXT,
  image_key TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_animals_name ON animals (name);
CREATE INDEX IF NOT EXISTS idx_animals_category ON animals (category);
CREATE INDEX IF NOT EXISTS idx_animals_habitat ON animals (habitat);
CREATE INDEX IF NOT EXISTS idx_animals_conservation_status ON animals (conservation_status);
CREATE INDEX IF NOT EXISTS idx_animals_created_at ON animals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_animals_search ON animals (LOWER(name), LOWER(scientific_name));

CREATE TABLE IF NOT EXISTS animal_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO animal_categories (name)
VALUES ('Mamalia'), ('Reptil'), ('Aves'), ('Pisces'), ('Amfibi'), ('Lainnya')
ON CONFLICT (name) DO NOTHING;
