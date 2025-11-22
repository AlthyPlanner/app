const fs = require('fs').promises;
const path = require('path');

const EMAILS_FILE = path.join(__dirname, '..', 'data', 'emails.json');

class Email {
  static async initializeFile() {
    try {
      await fs.access(EMAILS_FILE);
    } catch (error) {
      // Create directory if it doesn't exist
      const dir = path.dirname(EMAILS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(EMAILS_FILE, JSON.stringify([], null, 2));
    }
  }

  static async readEmails() {
    await this.initializeFile();
    const content = await fs.readFile(EMAILS_FILE, 'utf8');
    let emails = [];
    if (content.trim()) {
      try {
        emails = JSON.parse(content);
      } catch (error) {
        console.error('Error parsing emails.json:', error);
        emails = [];
      }
    }
    return emails;
  }

  static async writeEmails(emails) {
    await this.initializeFile();
    await fs.writeFile(EMAILS_FILE, JSON.stringify(emails, null, 2));
  }

  static async addEmail(emailData) {
    const emails = await this.readEmails();
    
    // Check if email already exists
    const existingEmail = emails.find(e => e.email.toLowerCase() === emailData.email.toLowerCase());
    if (existingEmail) {
      // Update timestamp if email already exists
      existingEmail.updatedAt = new Date().toISOString();
      if (emailData.source) existingEmail.source = emailData.source;
      await this.writeEmails(emails);
      return existingEmail;
    }

    // Add new email
    const newEmail = {
      email: emailData.email.toLowerCase().trim(),
      source: emailData.source || 'unknown', // 'hero', 'footer', 'educator'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add additional fields if present (for educator form)
    if (emailData.name) newEmail.name = emailData.name;
    if (emailData.organization) newEmail.organization = emailData.organization;
    if (emailData.message) newEmail.message = emailData.message;

    emails.push(newEmail);
    await this.writeEmails(emails);
    return newEmail;
  }

  static async getAll() {
    return await this.readEmails();
  }
}

module.exports = Email;

