import { createTask, updateTask, permanentDeleteTask } from '../api/tasks'
import { createProject } from '../api/projects'
import { createPerson } from '../api/people'

// Anthropic tool schemas for the interview AI
export const INTERVIEW_TOOLS = [
  {
    name: 'create_task',
    description: 'Create a new task in Focus Flow when the user explicitly asks for one to be added. Status rules: use "next_action" only if you confirmed the task title, the concrete next physical action, and the project (or that it is standalone) during this conversation. Default to "inbox" when in doubt.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        project_id: { type: 'string', description: 'Project ID to link the task to (optional — only set if you have the ID from context)' },
        status: { type: 'string', enum: ['inbox', 'next_action'], description: 'Task status. Default: inbox.' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format (optional)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project in Focus Flow when the user mentions they want to start, create, or work on something that is clearly a multi-step outcome — even if they say "I\'m thinking about" or "I\'m considering" starting a project. Err on the side of creating it — they can always scrap it later.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Project title' },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_person',
    description: 'Create a new person/contact in Focus Flow when the user explicitly asks for one to be added.',
    input_schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        company: { type: 'string', description: 'Company or organization (optional)' },
        relationship: { type: 'string', description: 'Relationship type e.g. colleague, client, friend (optional)' },
        occupation: { type: 'string', description: 'Job title or role (optional)' },
      },
      required: ['first_name', 'last_name'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task — e.g. link it to a project, change its status, or set a due date. Use task IDs from the context provided at the start of the interview.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'ID of the task to update' },
        project_id: { type: 'string', description: 'Project ID to link the task to (optional)' },
        status: { type: 'string', enum: ['inbox', 'next_action', 'queued', 'waiting', 'scheduled', 'someday'], description: 'New status (optional)' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format (optional)' },
        title: { type: 'string', description: 'New title (optional)' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Permanently delete a task. Use when the user wants to convert a task into a project — delete the task after creating the project with the same name.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'ID of the task to permanently delete' },
      },
      required: ['task_id'],
    },
  },
]

// Executor functions — called when the AI uses a tool
export const INTERVIEW_EXECUTORS = {
  async create_task(input) {
    const task = await createTask({
      title: input.title,
      project_id: input.project_id ?? null,
      status: input.status ?? 'inbox',
      ...(input.due_date ? { due_date: input.due_date } : {}),
    })
    return { id: task.id, title: task.title, status: task.status }
  },

  async create_project(input) {
    const project = await createProject({ title: input.title })
    return { id: project.id, title: project.title, status: project.status }
  },

  async update_task(input) {
    const { task_id, ...fields } = input
    const task = await updateTask(task_id, fields)
    return { id: task.id, title: task.title, status: task.status }
  },

  async delete_task(input) {
    await permanentDeleteTask(input.task_id)
    return { deleted: true, task_id: input.task_id }
  },

  async create_person(input) {
    const person = await createPerson({
      first_name: input.first_name,
      last_name: input.last_name,
      ...(input.company ? { company: input.company } : {}),
      ...(input.relationship ? { relationship: input.relationship } : {}),
      ...(input.occupation ? { occupation: input.occupation } : {}),
    })
    return { id: person.id, first_name: person.first_name, last_name: person.last_name }
  },
}
