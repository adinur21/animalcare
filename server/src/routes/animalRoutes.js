import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { randomUUID } from 'crypto';

import { query } from '../config/database.js';
import { deleteFromS3, uploadToS3 } from '../config/s3.js';
import { jsonError, jsonSuccess } from '../utils/response.js';

const router = express.Router();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WebP images are allowed.'));
    }
    cb(null, true);
  }
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return jsonError(res, 413, 'File too large. Maximum size is 5 MB.');
  }

  if (err) {
    return jsonError(res, 400, err.message || 'File upload failed');
  }

  return next();
};

const animalSchema = z.object({
  name: z.string().trim().min(1).max(150),
  scientific_name: z.string().trim().max(200).nullable().optional(),
  category: z.enum(['Mamalia', 'Reptil', 'Aves', 'Pisces', 'Amfibi', 'Lainnya']),
  habitat: z.string().trim().max(150).nullable().optional(),
  diet: z.string().trim().max(100).nullable().optional(),
  gender: z.enum(['Jantan', 'Betina', 'Tidak Diketahui']).optional(),
  age_years: z.coerce.number().min(0).max(200).optional().or(z.literal('')),
  weight_kg: z.coerce.number().min(0).max(10000).optional().or(z.literal('')),
  origin: z.string().trim().max(200).nullable().optional(),
  conservation_status: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  image_key: z.string().trim().max(500).nullable().optional()
});

function normalizePayload(payload) {
  const cleaned = { ...payload };

  ['scientific_name', 'habitat', 'diet', 'origin', 'conservation_status', 'description', 'image_key']
    .forEach((field) => {
      if (cleaned[field] === undefined || cleaned[field] === null || cleaned[field] === '') {
        cleaned[field] = null;
      }
    });

  return cleaned;
}

function buildFilters({ search, category, habitat, conservation_status, sortBy, sortOrder, limit, offset }) {
  const filters = [];
  const values = [];

  if (search) {
    filters.push('(LOWER(name) LIKE LOWER($1) OR LOWER(scientific_name) LIKE LOWER($1))');
    values.push(`%${search}%`);
  }

  if (category) {
    filters.push('category = $' + (values.length + 1));
    values.push(category);
  }

  if (habitat) {
    filters.push('habitat = $' + (values.length + 1));
    values.push(habitat);
  }

  if (conservation_status) {
    filters.push('conservation_status = $' + (values.length + 1));
    values.push(conservation_status);
  }

  const orderBy = sortBy === 'created_at' ? 'created_at' : 'name';
  const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';

  return { filters, values, orderBy, direction, limit: Number(limit) || 10, offset: Number(offset) || 0 };
}

router.get('/', async (req, res) => {
  try {
    const { search = '', category = '', habitat = '', conservation_status = '', sortBy = 'name', sortOrder = 'asc', page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const { filters, values, orderBy, direction } = buildFilters({
      search,
      category,
      habitat,
      conservation_status,
      sortBy,
      sortOrder,
      limit,
      offset
    });

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const countSql = `SELECT COUNT(*)::int AS total FROM animals ${whereClause}`;
    const countResult = await query(countSql, values);
    const total = countResult.rows[0].total;

    const listSql = `
      SELECT *
      FROM animals
      ${whereClause}
      ORDER BY ${orderBy} ${direction}, created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const listResult = await query(listSql, [...values, Number(limit), Number(offset)]);

    jsonSuccess(res, 200, {
      data: listResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.max(1, Math.ceil(total / Number(limit)))
      }
    });
  } catch (error) {
    jsonError(res, 500, 'Could not fetch animal records', error.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM animals WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) {
      return jsonError(res, 404, 'Animal not found');
    }

    return jsonSuccess(res, 200, { data: result.rows[0] });
  } catch (error) {
    return jsonError(res, 500, 'Could not fetch animal details', error.message);
  }
});

router.post('/', upload.single('image'), handleUploadError, async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const validated = animalSchema.safeParse(payload);
    if (!validated.success) {
      return jsonError(res, 400, 'Invalid animal data', validated.error.issues);
    }

    let imageKey = validated.data.image_key || null;
    if (req.file) {
      const uploaded = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);
      imageKey = uploaded.key;
    }

    const values = { ...validated.data, image_key: imageKey };
    const id = randomUUID();

    const insertSql = `
      INSERT INTO animals (
        id, name, scientific_name, category, habitat, diet, gender, age_years, weight_kg,
        origin, conservation_status, description, image_key, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `;

    const result = await query(insertSql, [
      id,
      values.name,
      values.scientific_name,
      values.category,
      values.habitat,
      values.diet,
      values.gender || null,
      values.age_years ?? null,
      values.weight_kg ?? null,
      values.origin,
      values.conservation_status,
      values.description,
      imageKey
    ]);

    return jsonSuccess(res, 201, { data: result.rows[0], message: 'Animal created successfully' });
  } catch (error) {
    return jsonError(res, 500, 'Could not create animal', error.message);
  }
});

router.put('/:id', upload.single('image'), handleUploadError, async (req, res) => {
  try {
    const existing = await query('SELECT * FROM animals WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) {
      return jsonError(res, 404, 'Animal not found');
    }

    const payload = normalizePayload(req.body);
    const validated = animalSchema.safeParse(payload);
    if (!validated.success) {
      return jsonError(res, 400, 'Invalid animal data', validated.error.issues);
    }

    let imageKey = validated.data.image_key || existing.rows[0].image_key || null;
    const oldImageKey = existing.rows[0].image_key;

    if (req.file) {
      const uploaded = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);
      imageKey = uploaded.key;
    }

    const values = { ...validated.data, image_key: imageKey };
    const updateSql = `
      UPDATE animals
      SET name = $1,
          scientific_name = $2,
          category = $3,
          habitat = $4,
          diet = $5,
          gender = $6,
          age_years = $7,
          weight_kg = $8,
          origin = $9,
          conservation_status = $10,
          description = $11,
          image_key = $12,
          updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `;

    const result = await query(updateSql, [
      values.name,
      values.scientific_name,
      values.category,
      values.habitat,
      values.diet,
      values.gender || null,
      values.age_years ?? null,
      values.weight_kg ?? null,
      values.origin,
      values.conservation_status,
      values.description,
      imageKey,
      req.params.id
    ]);

    if (req.file && oldImageKey && oldImageKey !== imageKey) {
      try {
        await deleteFromS3(oldImageKey);
      } catch (cleanupError) {
        console.error('Failed to delete old animal image', cleanupError);
      }
    }

    return jsonSuccess(res, 200, { data: result.rows[0], message: 'Animal updated successfully' });
  } catch (error) {
    return jsonError(res, 500, 'Could not update animal', error.message);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await query('SELECT * FROM animals WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) {
      return jsonError(res, 404, 'Animal not found');
    }

    const result = await query('DELETE FROM animals WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows[0]?.image_key) {
      try {
        await deleteFromS3(result.rows[0].image_key);
      } catch (cleanupError) {
        console.error('Failed to delete animal image from S3', cleanupError);
      }
    }

    return jsonSuccess(res, 200, { data: { id: result.rows[0].id }, message: 'Animal deleted successfully' });
  } catch (error) {
    return jsonError(res, 500, 'Could not delete animal', error.message);
  }
});

export default router;
