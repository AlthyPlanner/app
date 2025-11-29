const pool = require('../db/connection');

class Goal {
  // Get all goals for a user
  static async getAll(userId) {
    try {
      const result = await pool.query(
        `SELECT 
          g.id,
          g.user_id,
          g.title,
          g.description,
          g.category,
          g.target,
          g.target_date,
          g.progress_percent,
          g.status,
          g.created_at,
          g.updated_at
        FROM goals g
        WHERE g.user_id = $1
        ORDER BY g.created_at DESC`,
        [userId]
      );
      
      // Get milestones for each goal
      const goals = await Promise.all(
        result.rows.map(async (row) => {
          const milestonesResult = await pool.query(
            `SELECT id, title, is_completed, created_at
             FROM goal_milestones
             WHERE goal_id = $1
             ORDER BY created_at ASC`,
            [row.id]
          );

          return {
            id: row.id,
            title: row.title,
            description: row.description || '',
            category: row.category || null,
            categoryColor: this.getCategoryColor(row.category),
            target: row.target || null,
            deadline: row.target_date ? new Date(row.target_date).toISOString().slice(0, 7) : null,
            target_date: row.target_date ? new Date(row.target_date).toISOString() : null,
            progress: row.progress_percent || 0,
            status: row.status || 'active',
            milestones: milestonesResult.rows.map((m, idx) => ({
              id: m.id,
              text: m.title,
              completed: m.is_completed
            })),
            created_at: row.created_at,
            updated_at: row.updated_at
          };
        })
      );

      return goals;
    } catch (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }
  }

  // Get a single goal by ID
  static async getById(goalId, userId) {
    try {
      const result = await pool.query(
        `SELECT * FROM goals WHERE id = $1 AND user_id = $2`,
        [goalId, userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Goal not found');
      }
      
      const row = result.rows[0];
      
      // Get milestones
      const milestonesResult = await pool.query(
        `SELECT id, title, is_completed, created_at
         FROM goal_milestones
         WHERE goal_id = $1
         ORDER BY created_at ASC`,
        [row.id]
      );

      return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        category: row.category || null,
        categoryColor: this.getCategoryColor(row.category),
        target: row.target || null,
        deadline: row.target_date ? new Date(row.target_date).toISOString().slice(0, 7) : null,
        target_date: row.target_date ? new Date(row.target_date).toISOString() : null,
        progress: row.progress_percent || 0,
        status: row.status || 'active',
        milestones: milestonesResult.rows.map((m, idx) => ({
          id: m.id,
          text: m.title,
          completed: m.is_completed
        })),
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error fetching goal:', error);
      throw error;
    }
  }

  // Create a new goal
  static async create(userId, goalData) {
    try {
      const {
        title,
        description,
        category,
        target,
        deadline,
        milestones = []
      } = goalData;

      if (!title || !title.trim()) {
        throw new Error('Title is required');
      }

      // Insert goal
      const result = await pool.query(
        `INSERT INTO goals (
          user_id, title, description, category, target, target_date,
          progress_percent, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *`,
        [
          userId,
          title.trim(),
          description || null,
          category || null,
          target || null,
          deadline ? new Date(deadline) : null,
          0,
          'active'
        ]
      );

      const goalId = result.rows[0].id;

      // Insert milestones
      if (milestones && milestones.length > 0) {
        for (const milestone of milestones) {
          await pool.query(
            `INSERT INTO goal_milestones (goal_id, title, is_completed, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [goalId, milestone.text || milestone.title, milestone.completed || false]
          );
        }
      }

      return await this.getById(goalId, userId);
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }

  // Update a goal
  static async update(goalId, userId, goalData) {
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (goalData.title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(goalData.title.trim());
      }
      if (goalData.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(goalData.description || null);
      }
      if (goalData.category !== undefined) {
        updates.push(`category = $${paramCount++}`);
        values.push(goalData.category || null);
      }
      if (goalData.target !== undefined) {
        updates.push(`target = $${paramCount++}`);
        values.push(goalData.target || null);
      }
      if (goalData.deadline !== undefined || goalData.target_date !== undefined) {
        updates.push(`target_date = $${paramCount++}`);
        values.push((goalData.deadline || goalData.target_date) ? new Date(goalData.deadline || goalData.target_date) : null);
      }
      if (goalData.progress !== undefined || goalData.progress_percent !== undefined) {
        updates.push(`progress_percent = $${paramCount++}`);
        values.push(goalData.progress || goalData.progress_percent || 0);
      }
      if (goalData.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(goalData.status || 'active');
      }

      // Update milestones if provided
      if (goalData.milestones !== undefined) {
        // Delete existing milestones
        await pool.query(
          `DELETE FROM goal_milestones WHERE goal_id = $1`,
          [goalId]
        );

        // Insert new milestones
        if (goalData.milestones.length > 0) {
          for (const milestone of goalData.milestones) {
            await pool.query(
              `INSERT INTO goal_milestones (goal_id, title, is_completed, created_at)
               VALUES ($1, $2, $3, NOW())`,
              [goalId, milestone.text || milestone.title, milestone.completed || false]
            );
          }
        }
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(goalId, userId);

        await pool.query(
          `UPDATE goals 
           SET ${updates.join(', ')}
           WHERE id = $${paramCount++} AND user_id = $${paramCount++}`,
          values
        );
      }

      return await this.getById(goalId, userId);
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  // Delete a goal
  static async delete(goalId, userId) {
    try {
      // Milestones will be deleted automatically due to CASCADE
      const result = await pool.query(
        `DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id`,
        [goalId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Goal not found');
      }

      return { message: 'Goal deleted successfully' };
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }

  // Helper to get category color
  static getCategoryColor(category) {
    const colors = {
      'Work': '#1976d2',
      'Study': '#8e24aa',
      'Fitness': '#2e7d32',
      'Leisure': '#ef6c00',
      'Personal': '#9333ea',
      'Health': '#10b981'
    };
    return colors[category] || '#666666';
  }

  // Toggle milestone status (for backward compatibility with chat service)
  static async toggleMilestone(goalId, userId, milestoneId) {
    try {
      const goal = await this.getById(goalId, userId);
      const milestone = goal.milestones.find(m => m.id == milestoneId);
      
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // Update milestone
      await pool.query(
        `UPDATE goal_milestones 
         SET is_completed = $1, updated_at = NOW()
         WHERE id = $2 AND goal_id = $3`,
        [!milestone.completed, milestoneId, goalId]
      );

      // Recalculate progress
      const milestonesResult = await pool.query(
        `SELECT COUNT(*) as total, 
                SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed
         FROM goal_milestones
         WHERE goal_id = $1`,
        [goalId]
      );

      const total = parseInt(milestonesResult.rows[0].total) || 0;
      const completed = parseInt(milestonesResult.rows[0].completed) || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      await pool.query(
        `UPDATE goals 
         SET progress_percent = $1, updated_at = NOW()
         WHERE id = $2`,
        [progress, goalId]
      );

      return await this.getById(goalId, userId);
    } catch (error) {
      console.error('Error toggling milestone:', error);
      throw error;
    }
  }
}

module.exports = Goal;
