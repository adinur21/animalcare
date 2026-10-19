import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const sampleAnimals = [
  {
    name: 'Harimau Sumatra',
    scientific_name: 'Panthera tigris sumatrae',
    category: 'Mamalia',
    habitat: 'Hutan hujan tropis',
    diet: 'Daging',
    gender: 'Jantan',
    age_years: 5.5,
    weight_kg: 120,
    origin: 'Sumatra',
    conservation_status: 'Kritis',
    description: 'Harimau Sumatra adalah subspesies macan yang berkembang di pulau Sumatra.',
    image_key: 'animals/sample-tiger.jpg'
  },
  {
    name: 'Komodo',
    scientific_name: 'Varanus komodoensis',
    category: 'Reptil',
    habitat: 'Padang savana kering',
    diet: 'Karnivora',
    gender: 'Betina',
    age_years: 14,
    weight_kg: 85,
    origin: 'Pulau Komodo',
    conservation_status: 'Terancam',
    description: 'Komodo adalah kadal terbesar di dunia yang hidup di Indonesia.',
    image_key: 'animals/sample-komodo.jpg'
  },
  {
    name: 'Burung Cenderawasih',
    scientific_name: 'Paradisaeidae',
    category: 'Aves',
    habitat: 'Hutan pegunungan',
    diet: 'Buah dan serangga',
    gender: 'Jantan',
    age_years: 3.2,
    weight_kg: 2.1,
    origin: 'Papua',
    conservation_status: 'Rentan',
    description: 'Burung cenderawasih dikenal karena bulu ekornya yang indah dan tampilan ritual kawin.',
    image_key: 'animals/sample-bird.jpg'
  }
];

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'animalcare',
  user: process.env.DB_USER || 'animalcare_user',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

try {
  await client.connect();
  for (const animal of sampleAnimals) {
    await client.query(
      `INSERT INTO animals (name, scientific_name, category, habitat, diet, gender, age_years, weight_kg, origin, conservation_status, description, image_key, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [
        animal.name,
        animal.scientific_name,
        animal.category,
        animal.habitat,
        animal.diet,
        animal.gender,
        animal.age_years,
        animal.weight_kg,
        animal.origin,
        animal.conservation_status,
        animal.description,
        animal.image_key
      ]
    );
  }

  console.log('Seed data inserted successfully');
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
