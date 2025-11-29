const pool = require('../db/connection');

class Task {
  // Get all tasks for a user
  static async getAll(userId) {
    try {
      const result = await pool.query(
        `SELECT 
          t.id,
          t.user_id,
          t.title,
          t.description,
          t.category,
          t.goal_id,
          t.status,
          t.due_date,
          t.start_time,
          t.end_time,
          t.created_at,
          t.updated_at,
          t.priority
        FROM tasks t
        WHERE t.user_id = $1
        ORDER BY t.created_at DESC`,
        [userId]
      );
      
      // Transform to match frontend format
      return result.rows.map(row => ({
        id: row.id,
        text: row.title,
        description: row.description,
        category: row.category,
        goal: row.goal_id,
        status: row.status === 'complete' ? 'complete' : 
               row.status === 'in_progress' ? 'in_progress' : 
               row.status === 'forward' ? 'forward' : null,
        completed: row.status === 'complete',
        due: row.due_date ? new Date(row.due_date).toISOString() : null,
        start_time: row.start_time ? new Date(row.start_time).toISOString() : null,
        end_time: row.end_time ? new Date(row.end_time).toISOString() : null,
        priority: row.priority || 'none',
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  // Get a single task by ID
  static async getById(taskId, userId) {
    try {
      const result = await pool.query(
        `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
        [taskId, userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        text: row.title,
        description: row.description,
        category: row.category,
        goal: row.goal_id,
        status: row.status === 'complete' ? 'complete' : 
               row.status === 'in_progress' ? 'in_progress' : 
               row.status === 'forward' ? 'forward' : null,
        completed: row.status === 'complete',
        due: row.due_date ? new Date(row.due_date).toISOString() : null,
        start_time: row.start_time ? new Date(row.start_time).toISOString() : null,
        end_time: row.end_time ? new Date(row.end_time).toISOString() : null,
        priority: row.priority || 'none',
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }

  // Create a new task
  static async create(userId, taskData) {
    try {
      const {
        todo: title,
        due,
        type,
        category,
        goal,
        priority,
        status,
        description
      } = taskData;

      const result = await pool.query(
        `INSERT INTO tasks (
          user_id, title, description, category, goal_id, 
          status, due_date, priority, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *`,
        [
          userId,
          title.trim(),
          description || null,
          category || null,
          goal || null,
          status || 'pending',
          due ? new Date(due) : null,
          priority || 'none'
        ]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        text: row.title,
        description: row.description,
        category: row.category,
        goal: row.goal_id,
        status: row.status === 'complete' ? 'complete' : 
               row.status === 'in_progress' ? 'in_progress' : 
               row.status === 'forward' ? 'forward' : null,
        completed: row.status === 'complete',
        due: row.due_date ? new Date(row.due_date).toISOString() : null,
        priority: row.priority || 'none',
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Update a task
  static async update(taskId, userId, taskData) {
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (taskData.todo !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(taskData.todo.trim());
      }
      if (taskData.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(taskData.description || null);
      }
      if (taskData.category !== undefined) {
        updates.push(`category = $${paramCount++}`);
        values.push(taskData.category || null);
      }
      if (taskData.goal !== undefined) {
        updates.push(`goal_id = $${paramCount++}`);
        values.push(taskData.goal || null);
      }
      if (taskData.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(taskData.status || 'pending');
      }
      if (taskData.due !== undefined) {
        updates.push(`due_date = $${paramCount++}`);
        values.push(taskData.due ? new Date(taskData.due) : null);
      }
      if (taskData.priority !== undefined) {
        updates.push(`priority = $${paramCount++}`);
        values.push(taskData.priority || 'none');
      }

      if (updates.length === 0) {
        return await this.getById(taskId, userId);
      }

      updates.push(`updated_at = NOW()`);
      values.push(taskId, userId);

      const result = await pool.query(
        `UPDATE tasks 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        text: row.title,
        description: row.description,
        category: row.category,
        goal: row.goal_id,
        status: row.status === 'complete' ? 'complete' : 
               row.status === 'in_progress' ? 'in_progress' : 
               row.status === 'forward' ? 'forward' : null,
        completed: row.status === 'complete',
        due: row.due_date ? new Date(row.due_date).toISOString() : null,
        priority: row.priority || 'none',
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Toggle task completion
  static async toggle(taskId, userId) {
    try {
      const task = await this.getById(taskId, userId);
      const newStatus = task.completed ? 'pending' : 'complete';
      
      return await this.update(taskId, userId, { status: newStatus });
    } catch (error) {
      console.error('Error toggling task:', error);
      throw error;
    }
  }

  // Delete a task
  static async delete(taskId, userId) {
    try {
      const result = await pool.query(
        `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id`,
        [taskId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      return { message: 'Task deleted successfully' };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
}

module.exports = Task;


