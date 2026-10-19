import express from 'express';
import { query } from '../config/database.js';
import { jsonError, jsonSuccess } from '../utils/response.js';

const router = express.Router();

router.get('/stats', async (_req, res) => {
  try {
    const totalAnimalsSql = 'SELECT COUNT(*)::int AS total FROM animals';
    const categorySql = `
      SELECT category, COUNT(*)::int AS count
      FROM animals
      GROUP BY category
      ORDER BY count DESC, category ASC
    `;
    const habitatSql = `
      SELECT habitat, COUNT(*)::int AS count
      FROM animals
      WHERE habitat IS NOT NULL AND habitat <> ''
      GROUP BY habitat
      ORDER BY count DESC, habitat ASC
    `;
    const conservationSql = `
      SELECT conservation_status, COUNT(*)::int AS count
      FROM animals
      WHERE conservation_status IS NOT NULL AND conservation_status <> ''
      GROUP BY conservation_status
      ORDER BY count DESC, conservation_status ASC
    `;
    const recentSql = `
      SELECT *
      FROM animals
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const updatedSql = `
      SELECT *
      FROM animals
      ORDER BY updated_at DESC
      LIMIT 5
    `;

    const [totalResult, categoryResult, habitatResult, conservationResult, recentResult, updatedResult] = await Promise.all([
      query(totalAnimalsSql),
      query(categorySql),
      query(habitatSql),
      query(conservationSql),
      query(recentSql),
      query(updatedSql)
    ]);

    jsonSuccess(res, 200, {
      data: {
        totalAnimals: Number(totalResult.rows[0]?.total || 0),
        totalCategories: categoryResult.rowCount || 0,
        categoryBreakdown: categoryResult.rows,
        habitatBreakdown: habitatResult.rows,
        conservationBreakdown: conservationResult.rows,
        recentlyAdded: recentResult.rows,
        recentlyUpdated: updatedResult.rows
      }
    });
  } catch (error) {
    jsonError(res, 500, 'Could not fetch dashboard statistics', error.message);
  }
});

export default router;
