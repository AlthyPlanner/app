const pool = require('../db/connection');

class Email {
  static async addEmail(emailData) {
    try {
      const { email, source, name, organization, message } = emailData;
      
      // Check if email already exists
      const existingResult = await pool.query(
        'SELECT * FROM emails WHERE LOWER(email) = LOWER($1)',
        [email.trim()]
      );

      if (existingResult.rows.length > 0) {
        // Update existing email
        const updatedResult = await pool.query(
          `UPDATE emails 
           SET updated_at = CURRENT_TIMESTAMP,
               source = COALESCE($2, source),
               name = COALESCE(NULLIF($3, ''), name),
               organization = COALESCE(NULLIF($4, ''), organization),
               message = COALESCE(NULLIF($5, ''), message)
           WHERE LOWER(email) = LOWER($1)
           RETURNING *`,
          [email.trim(), source || null, name || null, organization || null, message || null]
        );
        return updatedResult.rows[0];
      }

      // Insert new email
      const insertResult = await pool.query(
        `INSERT INTO emails (email, source, name, organization, message)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          email.trim().toLowerCase(),
          source || 'unknown',
          name || null,
          organization || null,
          message || null
        ]
      );
      
      return insertResult.rows[0];
    } catch (error) {
      console.error('Error adding email to database:', error);
      throw error;
    }
  }

  static async getAll() {
    try {
      const result = await pool.query(
        'SELECT * FROM emails ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching emails from database:', error);
      throw error;
    }
  }

  static async getBySource(source) {
    try {
      const result = await pool.query(
        'SELECT * FROM emails WHERE source = $1 ORDER BY created_at DESC',
        [source]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching emails by source:', error);
      throw error;
    }
  }
}

module.exports = Email;
