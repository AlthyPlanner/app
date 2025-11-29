const fs = require('fs').promises;
const path = require('path');

const GOALS_FILE = path.join(__dirname, '..', 'data', 'goals.json');

class Goal {
  static async initializeFile() {
    try {
      await fs.access(GOALS_FILE);
    } catch (error) {
      // Create directory if it doesn't exist
      const dir = path.dirname(GOALS_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(GOALS_FILE, JSON.stringify([], null, 2));
    }
  }

  static async readGoals() {
    await this.initializeFile();
    const content = await fs.readFile(GOALS_FILE, 'utf8');
    let goals = [];
    if (content.trim()) {
      try {
        goals = JSON.parse(content);
        // Ensure each goal has the required properties
        goals = goals.map(goal => ({
          id: goal.id || this.generateId(),
          type: goal.type || 'goal',
          title: goal.title || '',
          category: goal.category || 'work',
          target: goal.target || null,
          deadline: goal.deadline || null,
          milestones: goal.milestones || [],
          progress: goal.progress !== undefined ? goal.progress : 0,
          createdAt: goal.createdAt || new Date().toISOString(),
          updatedAt: goal.updatedAt || new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error parsing goals.json:', error);
        goals = [];
      }
    }
    return goals;
  }

  static async writeGoals(goals) {
    await this.initializeFile();
    await fs.writeFile(GOALS_FILE, JSON.stringify(goals, null, 2));
  }

  static generateId() {
    return Math.random().toString(36).slice(2, 10);
  }

  static async getAll() {
    return await this.readGoals();
  }

  static async getById(id) {
    const goals = await this.readGoals();
    return goals.find(goal => goal.id === id);
  }

  static async create(goalData) {
    const goals = await this.readGoals();
    const newGoal = {
      id: this.generateId(),
      type: goalData.type || 'goal',
      title: (goalData.title || '').trim(),
      category: goalData.category || 'work',
      target: goalData.target ? goalData.target.trim() : null,
      deadline: goalData.deadline ? goalData.deadline.trim() : null,
      milestones: Array.isArray(goalData.milestones) 
        ? goalData.milestones.map((m, index) => ({
            id: m.id || index + 1,
            text: typeof m === 'string' ? m : (m.text || ''),
            completed: m.completed || false
          }))
        : [],
      progress: goalData.progress !== undefined ? goalData.progress : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    goals.push(newGoal);
    await this.writeGoals(goals);
    return newGoal;
  }

  static async update(id, goalData) {
    const goals = await this.readGoals();
    const index = goals.findIndex(g => g.id === id);
    if (index === -1) {
      throw new Error('Goal not found');
    }
    
    // Update fields if provided
    if (goalData.title !== undefined) {
      goals[index].title = goalData.title.trim();
    }
    if (goalData.type !== undefined) {
      goals[index].type = goalData.type;
    }
    if (goalData.category !== undefined) {
      goals[index].category = goalData.category;
    }
    if (goalData.target !== undefined) {
      goals[index].target = goalData.target ? goalData.target.trim() : null;
    }
    if (goalData.deadline !== undefined) {
      goals[index].deadline = goalData.deadline ? goalData.deadline.trim() : null;
    }
    if (goalData.milestones !== undefined) {
      goals[index].milestones = Array.isArray(goalData.milestones)
        ? goalData.milestones.map((m, idx) => ({
            id: m.id || idx + 1,
            text: typeof m === 'string' ? m : (m.text || ''),
            completed: m.completed || false
          }))
        : [];
    }
    if (goalData.progress !== undefined) {
      goals[index].progress = goalData.progress;
    }
    
    goals[index].updatedAt = new Date().toISOString();
    await this.writeGoals(goals);
    return goals[index];
  }

  static async delete(id) {
    const goals = await this.readGoals();
    const index = goals.findIndex(g => g.id === id);
    if (index === -1) {
      throw new Error('Goal not found');
    }
    
    goals.splice(index, 1);
    await this.writeGoals(goals);
    return { message: 'Goal deleted successfully' };
  }

  static async updateMilestone(goalId, milestoneId, completed) {
    const goals = await this.readGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    const milestone = goal.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      milestone.completed = completed;
      
      // Recalculate progress based on completed milestones
      const completedCount = goal.milestones.filter(m => m.completed).length;
      goal.progress = goal.milestones.length > 0 
        ? Math.round((completedCount / goal.milestones.length) * 100)
        : 0;
      
      goal.updatedAt = new Date().toISOString();
      await this.writeGoals(goals);
      return goal;
    }
    throw new Error('Milestone not found');
  }
}

module.exports = Goal;

