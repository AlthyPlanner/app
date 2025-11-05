const fs = require('fs').promises;
const path = require('path');

const TYPES_FILE = path.join(__dirname, '..', 'data', 'type.txt');

class Type {
  static async initializeFile() {
    try {
      await fs.access(TYPES_FILE);
    } catch {
      // Create directory if it doesn't exist
      const dir = path.dirname(TYPES_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(TYPES_FILE, '');
    }
  }

  static async readTypes() {
    await this.initializeFile();
    const content = await fs.readFile(TYPES_FILE, 'utf8');
    let types = [];
    if (content.trim()) {
      // Split by lines and filter out empty lines
      types = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(name => ({ name }));
    }
    return types;
  }

  static async writeTypes(types) {
    await this.initializeFile();
    // Convert types array to text format (one type per line)
    const content = types.map(type => type.name).join('\n');
    await fs.writeFile(TYPES_FILE, content);
  }

  static async getAll() {
    return await this.readTypes();
  }

  static async create(typeData) {
    const types = await this.readTypes();
    const newType = {
      name: typeData.name.trim()
    };
    types.push(newType);
    await this.writeTypes(types);
    return newType;
  }

  static async update(index, typeData) {
    const types = await this.readTypes();
    if (index < 0 || index >= types.length) {
      throw new Error('Type not found');
    }
    
    types[index].name = typeData.name.trim();
    
    await this.writeTypes(types);
    return types[index];
  }

  static async delete(index) {
    const types = await this.readTypes();
    if (index < 0 || index >= types.length) {
      throw new Error('Type not found');
    }
    
    types.splice(index, 1);
    await this.writeTypes(types);
    return { message: 'Type deleted successfully' };
  }
}

module.exports = Type; 