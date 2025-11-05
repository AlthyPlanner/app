const fs = require('fs').promises;
const path = require('path');

const TODOS_FILE = path.join(__dirname, '..', 'data', 'todos.json');

class Todo {
  static async initializeFile() {
    try {
      await fs.access(TODOS_FILE);
    } catch (error) {
      // Create directory if it doesn't exist
      const dir = path.dirname(TODOS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(TODOS_FILE, JSON.stringify([], null, 2));
    }
  }

  static async readTodos() {
    await this.initializeFile();
    const content = await fs.readFile(TODOS_FILE, 'utf8');
    let todos = [];
    if (content.trim()) {
      try {
        todos = JSON.parse(content);
        // Ensure each todo has the required properties
        todos = todos.map(todo => {
          if (typeof todo === 'string') {
            // Handle legacy string format
            return { text: todo, completed: false, due: null, type: '' };
          }
          return {
            text: todo.text || '',
            completed: todo.completed || false,
            due: todo.due || null,
            type: todo.type || ''
          };
        });
      } catch (error) {
        console.error('Error parsing todos.json:', error);
        todos = [];
      }
    }
    return todos;
  }

  static async writeTodos(todos) {
    await this.initializeFile();
    await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2));
  }

  static async getAll() {
    return await this.readTodos();
  }

  static async create(todoData) {
    const todos = await this.readTodos();
    const newTodo = {
      text: todoData.todo.trim(),
      completed: false,
      due: todoData.due || null,
      type: todoData.type || ''
    };
    todos.push(newTodo);
    await this.writeTodos(todos);
    return newTodo;
  }

  static async update(index, todoData) {
    const todos = await this.readTodos();
    if (index < 0 || index >= todos.length) {
      throw new Error('Todo not found');
    }
    
    todos[index].text = todoData.todo.trim();
    if (todoData.due !== undefined) {
      todos[index].due = todoData.due;
    }
    if (todoData.type !== undefined) {
      todos[index].type = todoData.type;
    }
    
    await this.writeTodos(todos);
    return todos[index];
  }

  static async toggle(index) {
    const todos = await this.readTodos();
    if (index < 0 || index >= todos.length) {
      throw new Error('Todo not found');
    }
    
    todos[index].completed = !todos[index].completed;
    await this.writeTodos(todos);
    return todos[index];
  }

  static async delete(index) {
    const todos = await this.readTodos();
    if (index < 0 || index >= todos.length) {
      throw new Error('Todo not found');
    }
    
    todos.splice(index, 1);
    await this.writeTodos(todos);
    return { message: 'Todo deleted successfully' };
  }
}

module.exports = Todo; 