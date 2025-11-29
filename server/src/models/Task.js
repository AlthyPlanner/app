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
          t.due_time,
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
        // Format due_date as date-only string (YYYY-MM-DD) to avoid timezone issues
        due: row.due_date ? this.formatDateOnly(row.due_date) : null,
        due_time: row.due_time ? new Date(row.due_time).toISOString() : null,
        priority: row.priority || 'none',
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      console.error('Error stack:', error.stack);
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
        // Format due_date as date-only string (YYYY-MM-DD) to avoid timezone issues
        due: row.due_date ? this.formatDateOnly(row.due_date) : null,
        due_time: row.due_time ? new Date(row.due_time).toISOString() : null,
        priority: row.priority || 'none',
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }

  // Helper to parse date string as local date (not UTC)
  static parseLocalDate(dateString) {
    if (!dateString) return null;
    
    // If it's already a Date object, return it
    if (dateString instanceof Date) {
      return dateString;
    }
    
    // If it's a YYYY-MM-DD string, parse as local date to avoid timezone issues
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    
    // For ISO strings or other formats, parse normally
    const date = new Date(dateString);
    
    // If it's an ISO string that looks like a date-only (ends with T00:00:00.000Z),
    // convert to local date to avoid timezone shift
    if (typeof dateString === 'string' && dateString.includes('T') && dateString.includes('Z')) {
      const dateOnly = dateString.split('T')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    
    return date;
  }

  // Helper to format date as YYYY-MM-DD string (date-only, no time)
  static formatDateOnly(date) {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Create a new task
  static async create(userId, taskData) {
    try {
      const {
        todo: title,
        due,
        due_time,
        type,
        category,
        goal,
        priority,
        status,
        description
      } = taskData;

      // Parse due date as local date to avoid timezone issues
      let dueDate = null;
      if (due) {
        dueDate = this.parseLocalDate(due);
        // Ensure it's a valid date
        if (isNaN(dueDate.getTime())) {
          console.warn(`Invalid due date: ${due}, setting to null`);
          dueDate = null;
        }
      }

      // Parse due_time if provided (should be a Date object or ISO string)
      let dueTime = null;
      if (due_time) {
        if (due_time instanceof Date) {
          dueTime = due_time;
        } else {
          dueTime = new Date(due_time);
        }
        // Validate due time
        if (isNaN(dueTime.getTime())) {
          console.warn(`Invalid due_time: ${due_time}, setting to null`);
          dueTime = null;
        }
      }

      const result = await pool.query(
        `INSERT INTO tasks (
          user_id, title, description, category, goal_id, 
          status, due_date, due_time, priority, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          userId,
          title.trim(),
          description || null,
          category || null,
          goal || null,
          status || 'pending',
          dueDate,
          dueTime, // due_time
          priority || 'none'
        ]
      );

      const row = result.rows[0];
      
      // Format due_date as date-only string (YYYY-MM-DD) to avoid timezone issues
      let dueDateString = null;
      if (row.due_date) {
        dueDateString = this.formatDateOnly(row.due_date);
      }
      
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
        due: dueDateString,
        due_time: row.due_time ? new Date(row.due_time).toISOString() : null,
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
        // Parse due date as local date to avoid timezone issues
        const dueDate = taskData.due ? this.parseLocalDate(taskData.due) : null;
        values.push(dueDate && !isNaN(dueDate.getTime()) ? dueDate : null);
      }
      if (taskData.due_time !== undefined) {
        updates.push(`due_time = $${paramCount++}`);
        // Parse due_time if provided
        let dueTime = null;
        if (taskData.due_time) {
          if (taskData.due_time instanceof Date) {
            dueTime = taskData.due_time;
          } else {
            dueTime = new Date(taskData.due_time);
          }
          if (isNaN(dueTime.getTime())) {
            console.warn(`Invalid due_time: ${taskData.due_time}, setting to null`);
            dueTime = null;
          }
        }
        values.push(dueTime);
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
        // Format due_date as date-only string (YYYY-MM-DD) to avoid timezone issues
        due: row.due_date ? this.formatDateOnly(row.due_date) : null,
        due_time: row.due_time ? new Date(row.due_time).toISOString() : null,
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


