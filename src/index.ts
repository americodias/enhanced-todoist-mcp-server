#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Comprehensive TypeScript types for Todoist API
interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  order: number;
  priority: number; // 1-4 (4 is highest)
  labels: string[];
  due?: {
    date: string;
    string: string;
    lang: string;
    is_recurring: boolean;
  };
  url: string;
  comment_count: number;
  created_at: string;
  creator_id: string;
  assignee_id?: string;
  assigner_id?: string;
  is_completed: boolean;
}

interface TodoistProject {
  id: string;
  name: string;
  color: string;
  parent_id?: string;
  child_order: number;
  collapsed: boolean;
  shared: boolean;
  is_deleted: boolean;
  is_archived: boolean;
  is_favorite: boolean;
  sync_id: number;
  inbox_project: boolean;
  team_inbox: boolean;
  view_style: "list" | "board";
  url: string;
  comment_count: number;
}

interface TodoistSection {
  id: string;
  project_id: string;
  order: number;
  name: string;
}

interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  is_favorite: boolean;
}

interface TodoistComment {
  id: string;
  task_id?: string;
  project_id?: string;
  posted_at: string;
  content: string;
  attachment?: {
    resource_type: string;
    file_url: string;
    file_type: string;
    file_name: string;
  };
}

interface TodoistFilter {
  id: string;
  name: string;
  query: string;
  color: string;
  item_order: number;
  is_deleted: boolean;
  is_favorite: boolean;
}

// Rate limiting implementation
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private capacity: number, private refillRate: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens: number = 1): Promise<boolean> {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Enhanced API client with comprehensive error handling
class TodoistAPIClient {
  private baseUrl = "https://api.todoist.com/rest/v2";
  private token: string;
  private rateLimiter: TokenBucket;

  constructor(token: string) {
    this.token = token;
    this.rateLimiter = new TokenBucket(1000, 66.67); // 1000 requests per 15 minutes
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Rate limiting
    if (!(await this.rateLimiter.consume())) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T; // No content response
    }

    return response.json();
  }

  // Task operations
  async getTasks(filter?: {
    project_id?: string;
    section_id?: string;
    label?: string;
    filter?: string;
    lang?: string;
    ids?: string[];
  }): Promise<TodoistTask[]> {
    const params = new URLSearchParams();
    if (filter?.project_id) params.append("project_id", filter.project_id);
    if (filter?.section_id) params.append("section_id", filter.section_id);
    if (filter?.label) params.append("label", filter.label);
    if (filter?.filter) params.append("filter", filter.filter);
    if (filter?.lang) params.append("lang", filter.lang);
    if (filter?.ids) params.append("ids", filter.ids.join(","));

    return this.makeRequest(`/tasks?${params.toString()}`);
  }

  async getTask(id: string): Promise<TodoistTask> {
    return this.makeRequest(`/tasks/${id}`);
  }

  async createTask(task: {
    content: string;
    description?: string;
    project_id?: string;
    section_id?: string;
    parent_id?: string;
    order?: number;
    priority?: number;
    labels?: string[];
    due_string?: string;
    due_date?: string;
    due_datetime?: string;
    due_lang?: string;
    assignee_id?: string;
  }): Promise<TodoistTask> {
    return this.makeRequest("/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, updates: {
    content?: string;
    description?: string;
    project_id?: string;
    section_id?: string;
    parent_id?: string;
    order?: number;
    priority?: number;
    labels?: string[];
    due_string?: string;
    due_date?: string;
    due_datetime?: string;
    due_lang?: string;
    assignee_id?: string;
  }): Promise<TodoistTask> {
    return this.makeRequest(`/tasks/${id}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  async completeTask(id: string): Promise<boolean> {
    await this.makeRequest(`/tasks/${id}/close`, { method: "POST" });
    return true;
  }

  async reopenTask(id: string): Promise<boolean> {
    await this.makeRequest(`/tasks/${id}/reopen`, { method: "POST" });
    return true;
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.makeRequest(`/tasks/${id}`, { method: "DELETE" });
    return true;
  }

  // Project operations
  async getProjects(): Promise<TodoistProject[]> {
    return this.makeRequest("/projects");
  }

  async getProject(id: string): Promise<TodoistProject> {
    return this.makeRequest(`/projects/${id}`);
  }

  async createProject(project: {
    name: string;
    parent_id?: string;
    color?: string;
    is_favorite?: boolean;
    view_style?: "list" | "board";
  }): Promise<TodoistProject> {
    return this.makeRequest("/projects", {
      method: "POST",
      body: JSON.stringify(project),
    });
  }

  async updateProject(id: string, updates: {
    name?: string;
    color?: string;
    is_favorite?: boolean;
    view_style?: "list" | "board";
  }): Promise<TodoistProject> {
    return this.makeRequest(`/projects/${id}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(id: string): Promise<boolean> {
    await this.makeRequest(`/projects/${id}`, { method: "DELETE" });
    return true;
  }

  // Section operations
  async getSections(project_id?: string): Promise<TodoistSection[]> {
    const params = project_id ? `?project_id=${project_id}` : "";
    return this.makeRequest(`/sections${params}`);
  }

  async getSection(id: string): Promise<TodoistSection> {
    return this.makeRequest(`/sections/${id}`);
  }

  async createSection(section: {
    name: string;
    project_id: string;
    order?: number;
  }): Promise<TodoistSection> {
    return this.makeRequest("/sections", {
      method: "POST",
      body: JSON.stringify(section),
    });
  }

  async updateSection(id: string, updates: {
    name?: string;
  }): Promise<TodoistSection> {
    return this.makeRequest(`/sections/${id}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  async deleteSection(id: string): Promise<boolean> {
    await this.makeRequest(`/sections/${id}`, { method: "DELETE" });
    return true;
  }

  // Label operations
  async getLabels(): Promise<TodoistLabel[]> {
    return this.makeRequest("/labels");
  }

  async getLabel(id: string): Promise<TodoistLabel> {
    return this.makeRequest(`/labels/${id}`);
  }

  async createLabel(label: {
    name: string;
    order?: number;
    color?: string;
    is_favorite?: boolean;
  }): Promise<TodoistLabel> {
    return this.makeRequest("/labels", {
      method: "POST",
      body: JSON.stringify(label),
    });
  }

  async updateLabel(id: string, updates: {
    name?: string;
    order?: number;
    color?: string;
    is_favorite?: boolean;
  }): Promise<TodoistLabel> {
    return this.makeRequest(`/labels/${id}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  async deleteLabel(id: string): Promise<boolean> {
    await this.makeRequest(`/labels/${id}`, { method: "DELETE" });
    return true;
  }

  // Comment operations
  async getComments(task_id?: string, project_id?: string): Promise<TodoistComment[]> {
    const params = new URLSearchParams();
    if (task_id) params.append("task_id", task_id);
    if (project_id) params.append("project_id", project_id);
    return this.makeRequest(`/comments?${params.toString()}`);
  }

  async getComment(id: string): Promise<TodoistComment> {
    return this.makeRequest(`/comments/${id}`);
  }

  async createComment(comment: {
    task_id?: string;
    project_id?: string;
    content: string;
    attachment?: any;
  }): Promise<TodoistComment> {
    return this.makeRequest("/comments", {
      method: "POST",
      body: JSON.stringify(comment),
    });
  }

  async updateComment(id: string, content: string): Promise<TodoistComment> {
    return this.makeRequest(`/comments/${id}`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(id: string): Promise<boolean> {
    await this.makeRequest(`/comments/${id}`, { method: "DELETE" });
    return true;
  }
}

// Validation schemas
const TaskCreateSchema = z.object({
  content: z.string().min(1).max(500),
  description: z.string().optional(),
  project_id: z.string().optional(),
  section_id: z.string().optional(),
  parent_id: z.string().optional(),
  priority: z.number().min(1).max(4).optional(),
  labels: z.array(z.string()).optional(),
  due_string: z.string().optional(),
  due_date: z.string().optional(),
  due_datetime: z.string().optional(),
  due_lang: z.string().optional(),
  assignee_id: z.string().optional(),
});

const TaskUpdateSchema = z.object({
  id: z.string(),
  content: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  project_id: z.string().optional(),
  section_id: z.string().optional(),
  priority: z.number().min(1).max(4).optional(),
  labels: z.array(z.string()).optional(),
  due_string: z.string().optional(),
  due_date: z.string().optional(),
  due_datetime: z.string().optional(),
  assignee_id: z.string().optional(),
});

const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(120),
  parent_id: z.string().optional(),
  color: z.string().optional(),
  view_style: z.enum(["list", "board"]).optional(),
  is_favorite: z.boolean().optional(),
});

const SectionCreateSchema = z.object({
  name: z.string().min(1).max(120),
  project_id: z.string(),
  order: z.number().optional(),
});

const LabelCreateSchema = z.object({
  name: z.string().min(1).max(50),
  order: z.number().optional(),
  color: z.string().optional(),
  is_favorite: z.boolean().optional(),
});

const CommentCreateSchema = z.object({
  content: z.string().min(1),
  task_id: z.string().optional(),
  project_id: z.string().optional(),
});

// Tool definitions
const TOOLS: Tool[] = [
  // Task management tools
  {
    name: "todoist_get_tasks",
    description: "Get a list of tasks from Todoist with various filters. Supports project, section, label, and custom filter queries using Todoist's natural language syntax.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "Filter tasks by project ID (optional)"
        },
        section_id: {
          type: "string",
          description: "Filter tasks by section ID (optional)"
        },
        label: {
          type: "string",
          description: "Filter tasks by label name (optional)"
        },
        filter: {
          type: "string",
          description: "Natural language filter like 'today', 'tomorrow', 'next week', 'priority 1', 'overdue' (optional)"
        },
        priority: {
          type: "number",
          description: "Filter by priority level (1-4) (optional)",
          enum: [1, 2, 3, 4]
        },
        limit: {
          type: "number",
          description: "Maximum number of tasks to return (optional)",
          default: 50
        }
      }
    }
  },
  {
    name: "todoist_get_task",
    description: "Get a specific task by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Task ID to retrieve"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "todoist_create_task",
    description: "Create a new task in Todoist with optional description, due date, and priority",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The content/title of the task"
        },
        description: {
          type: "string",
          description: "Detailed description of the task (optional)"
        },
        project_id: {
          type: "string",
          description: "Project ID to add task to (optional)"
        },
        section_id: {
          type: "string",
          description: "Section ID to add task to (optional)"
        },
        parent_id: {
          type: "string",
          description: "Parent task ID for subtasks (optional)"
        },
        priority: {
          type: "number",
          description: "Task priority from 1 (normal) to 4 (urgent) (optional)",
          enum: [1, 2, 3, 4]
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Array of label names (optional)"
        },
        due_string: {
          type: "string",
          description: "Natural language due date like 'tomorrow', 'next Monday', 'Jan 23' (optional)"
        },
        assignee_id: {
          type: "string",
          description: "User ID to assign task to (optional)"
        }
      },
      required: ["content"]
    }
  },
  {
    name: "todoist_update_task",
    description: "Update an existing task in Todoist by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Task ID to update"
        },
        content: {
          type: "string",
          description: "New content/title for the task (optional)"
        },
        description: {
          type: "string",
          description: "New description for the task (optional)"
        },
        project_id: {
          type: "string",
          description: "New project ID (optional)"
        },
        section_id: {
          type: "string",
          description: "New section ID (optional)"
        },
        priority: {
          type: "number",
          description: "New priority level from 1 (normal) to 4 (urgent) (optional)",
          enum: [1, 2, 3, 4]
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "New array of label names (optional)"
        },
        due_string: {
          type: "string",
          description: "New due date in natural language like 'tomorrow', 'next Monday' (optional)"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "todoist_complete_task",
    description: "Mark a task as complete by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Task ID to complete"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "todoist_reopen_task",
    description: "Reopen a completed task by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Task ID to reopen"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "todoist_delete_task",
    description: "Delete a task from Todoist by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Task ID to delete"
        }
      },
      required: ["id"]
    }
  },

  // Project management tools
  {
    name: "todoist_get_projects",
    description: "Get all projects",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "todoist_get_project",
    description: "Get a specific project by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Project ID to retrieve"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "todoist_create_project",
    description: "Create a new project",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Project name"
        },
        parent_id: {
          type: "string",
          description: "Parent project ID for sub-projects (optional)"
        },
        color: {
          type: "string",
          description: "Project color (optional)"
        },
        view_style: {
          type: "string",
          enum: ["list", "board"],
          description: "Project view style (optional)"
        },
        is_favorite: {
          type: "boolean",
          description: "Mark as favorite (optional)"
        }
      },
      required: ["name"]
    }
  },
  {
    name: "todoist_update_project",
    description: "Update an existing project",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Project ID to update"
        },
        name: {
          type: "string",
          description: "New project name (optional)"
        },
        color: {
          type: "string",
          description: "New project color (optional)"
        },
        view_style: {
          type: "string",
          enum: ["list", "board"],
          description: "New project view style (optional)"
        },
        is_favorite: {
          type: "boolean",
          description: "Mark as favorite (optional)"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "todoist_delete_project",
    description: "Delete a project",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Project ID to delete"
        }
      },
      required: ["id"]
    }
  },

  // Section management tools
  {
    name: "todoist_get_sections",
    description: "Get sections, optionally filtered by project",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "Filter sections by project ID (optional)"
        }
      }
    }
  },
  {
    name: "todoist_get_section",
    description: "Get a specific section by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Section ID to retrieve"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "todoist_create_section",
    description: "Create a new section within a project",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Section name"
        },
        project_id: {
          type: "string",
          description: "Project ID to add section to"
        },
        order: {
          type: "number",
          description: "Section order (optional)"
        }
      },
      required: ["name", "project_id"]
    }
  },
  {
    name: "todoist_update_section",
    description: "Update a section name",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Section ID to update"
        },
        name: {
          type: "string",
          description: "New section name"
        }
      },
      required: ["id", "name"]
    }
  },
  {
    name: "todoist_delete_section",
    description: "Delete a section",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Section ID to delete"
        }
      },
      required: ["id"]
    }
  },

  // Label management tools
  {
    name: "todoist_get_labels",
    description: "Get all labels",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "todoist_get_label",
    description: "Get a specific label by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Label ID to retrieve"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "todoist_create_label",
    description: "Create a new label",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Label name"
        },
        order: {
          type: "number",
          description: "Label order (optional)"
        },
        color: {
          type: "string",
          description: "Label color (optional)"
        },
        is_favorite: {
          type: "boolean",
          description: "Mark as favorite (optional)"
        }
      },
      required: ["name"]
    }
  },
  {
    name: "todoist_update_label",
    description: "Update a label",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Label ID to update"
        },
        name: {
          type: "string",
          description: "New label name (optional)"
        },
        order: {
          type: "number",
          description: "New label order (optional)"
        },
        color: {
          type: "string",
          description: "New label color (optional)"
        },
        is_favorite: {
          type: "boolean",
          description: "Mark as favorite (optional)"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "todoist_delete_label",
    description: "Delete a label",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Label ID to delete"
        }
      },
      required: ["id"]
    }
  },

  // Comment management tools
  {
    name: "todoist_get_comments",
    description: "Get comments for a task or project",
    inputSchema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "Get comments for specific task (optional)"
        },
        project_id: {
          type: "string",
          description: "Get comments for specific project (optional)"
        }
      }
    }
  },
  {
    name: "todoist_get_comment",
    description: "Get a specific comment by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Comment ID to retrieve"
        }
      },
      required: ["id"]
    }
  },
  {
    name: "todoist_create_comment",
    description: "Add a comment to a task or project",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Comment content"
        },
        task_id: {
          type: "string",
          description: "Task ID to comment on (optional)"
        },
        project_id: {
          type: "string",
          description: "Project ID to comment on (optional)"
        }
      },
      required: ["content"]
    }
  },
  {
    name: "todoist_update_comment",
    description: "Update an existing comment",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Comment ID to update"
        },
        content: {
          type: "string",
          description: "New comment content"
        }
      },
      required: ["id", "content"]
    }
  },
  {
    name: "todoist_delete_comment",
    description: "Delete a comment",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Comment ID to delete"
        }
      },
      required: ["id"]
    }
  },

  // Advanced search tools
  {
    name: "todoist_search_tasks",
    description: "Search for tasks by name or content across all projects",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to find tasks"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (optional)",
          default: 20
        }
      },
      required: ["query"]
    }
  },
  {
    name: "todoist_find_task_by_name",
    description: "Find a task by searching for its name/content (for backward compatibility)",
    inputSchema: {
      type: "object",
      properties: {
        task_name: {
          type: "string",
          description: "Name/content of the task to search for"
        }
      },
      required: ["task_name"]
    }
  }
];

// Main server implementation
class EnhancedTodoistMCPServer {
  private server: Server;
  private client: TodoistAPIClient;

  constructor() {
    const token = process.env.TODOIST_API_TOKEN;
    if (!token) {
      throw new Error("TODOIST_API_TOKEN environment variable is required");
    }

    this.client = new TodoistAPIClient(token);
    this.server = new Server(
      {
        name: "enhanced-todoist-mcp-server",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        if (!args) {
          throw new Error("No arguments provided");
        }

        switch (name) {
          case "todoist_get_tasks":
            return await this.handleGetTasks(args);
          case "todoist_get_task":
            return await this.handleGetTask(args);
          case "todoist_create_task":
            return await this.handleCreateTask(args);
          case "todoist_update_task":
            return await this.handleUpdateTask(args);
          case "todoist_complete_task":
            return await this.handleCompleteTask(args);
          case "todoist_reopen_task":
            return await this.handleReopenTask(args);
          case "todoist_delete_task":
            return await this.handleDeleteTask(args);

          case "todoist_get_projects":
            return await this.handleGetProjects(args);
          case "todoist_get_project":
            return await this.handleGetProject(args);
          case "todoist_create_project":
            return await this.handleCreateProject(args);
          case "todoist_update_project":
            return await this.handleUpdateProject(args);
          case "todoist_delete_project":
            return await this.handleDeleteProject(args);

          case "todoist_get_sections":
            return await this.handleGetSections(args);
          case "todoist_get_section":
            return await this.handleGetSection(args);
          case "todoist_create_section":
            return await this.handleCreateSection(args);
          case "todoist_update_section":
            return await this.handleUpdateSection(args);
          case "todoist_delete_section":
            return await this.handleDeleteSection(args);

          case "todoist_get_labels":
            return await this.handleGetLabels(args);
          case "todoist_get_label":
            return await this.handleGetLabel(args);
          case "todoist_create_label":
            return await this.handleCreateLabel(args);
          case "todoist_update_label":
            return await this.handleUpdateLabel(args);
          case "todoist_delete_label":
            return await this.handleDeleteLabel(args);

          case "todoist_get_comments":
            return await this.handleGetComments(args);
          case "todoist_get_comment":
            return await this.handleGetComment(args);
          case "todoist_create_comment":
            return await this.handleCreateComment(args);
          case "todoist_update_comment":
            return await this.handleUpdateComment(args);
          case "todoist_delete_comment":
            return await this.handleDeleteComment(args);

          case "todoist_search_tasks":
            return await this.handleSearchTasks(args);
          case "todoist_find_task_by_name":
            return await this.handleFindTaskByName(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: "text",
            text: `Error: ${errorMessage}`,
          }],
          isError: true,
        };
      }
    });
  }

  // Helper function to format task display
  private formatTask(task: TodoistTask): string {
    let result = `- ${task.content}`;
    if (task.description) result += `\n  Description: ${task.description}`;
    if (task.due) result += `\n  Due: ${task.due.string}`;
    if (task.priority > 1) result += `\n  Priority: ${task.priority}`;
    if (task.labels.length > 0) result += `\n  Labels: ${task.labels.join(', ')}`;
    result += `\n  ID: ${task.id}`;
    return result;
  }

  // Helper function to format project display
  private formatProject(project: TodoistProject): string {
    let result = `- ${project.name}`;
    if (project.color) result += ` (${project.color})`;
    result += `\n  ID: ${project.id}`;
    if (project.is_favorite) result += `\n  ⭐ Favorite`;
    if (project.view_style) result += `\n  View: ${project.view_style}`;
    return result;
  }

  // Task handler implementations
  private async handleGetTasks(args: any) {
    // Apply client-side limit for backward compatibility
    let tasks = await this.client.getTasks(args);
    
    // Apply additional filters
    if (args.priority) {
      tasks = tasks.filter(task => task.priority === args.priority);
    }
    
    // Apply limit
    if (args.limit && args.limit > 0) {
      tasks = tasks.slice(0, args.limit);
    }

    const taskList = tasks.map(task => this.formatTask(task)).join('\n\n');
    
    return {
      content: [{
        type: "text",
        text: tasks.length > 0 ? taskList : "No tasks found matching the criteria",
      }],
      isError: false,
    };
  }

  private async handleGetTask(args: any) {
    const task = await this.client.getTask(args.id);
    return {
      content: [{
        type: "text",
        text: this.formatTask(task),
      }],
      isError: false,
    };
  }

  private async handleCreateTask(args: any) {
    const validArgs = TaskCreateSchema.parse(args);
    // Remove undefined values to avoid API issues
    const cleanArgs = Object.fromEntries(
      Object.entries(validArgs).filter(([_, value]) => value !== undefined)
    );
    const task = await this.client.createTask(cleanArgs as any);
    return {
      content: [{
        type: "text",
        text: `Task created successfully:\n${this.formatTask(task)}`,
      }],
      isError: false,
    };
  }

  private async handleUpdateTask(args: any) {
    const validArgs = TaskUpdateSchema.parse(args);
    const { id, ...updates } = validArgs;
    // Remove undefined values to avoid API issues
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    const task = await this.client.updateTask(id, cleanUpdates as any);
    return {
      content: [{
        type: "text",
        text: `Task updated successfully:\n${this.formatTask(task)}`,
      }],
      isError: false,
    };
  }

  private async handleCompleteTask(args: any) {
    await this.client.completeTask(args.id);
    return {
      content: [{
        type: "text",
        text: `Successfully completed task (ID: ${args.id})`,
      }],
      isError: false,
    };
  }

  private async handleReopenTask(args: any) {
    await this.client.reopenTask(args.id);
    return {
      content: [{
        type: "text",
        text: `Successfully reopened task (ID: ${args.id})`,
      }],
      isError: false,
    };
  }

  private async handleDeleteTask(args: any) {
    await this.client.deleteTask(args.id);
    return {
      content: [{
        type: "text",
        text: `Successfully deleted task (ID: ${args.id})`,
      }],
      isError: false,
    };
  }

  // Project handler implementations
  private async handleGetProjects(args: any) {
    const projects = await this.client.getProjects();
    const projectList = projects.map(project => this.formatProject(project)).join('\n\n');
    return {
      content: [{
        type: "text",
        text: projects.length > 0 ? projectList : "No projects found",
      }],
      isError: false,
    };
  }

  private async handleGetProject(args: any) {
    const project = await this.client.getProject(args.id);
    return {
      content: [{
        type: "text",
        text: this.formatProject(project),
      }],
      isError: false,
    };
  }

  private async handleCreateProject(args: any) {
    const validArgs = ProjectCreateSchema.parse(args);
    // Remove undefined values to avoid API issues
    const cleanArgs = Object.fromEntries(
      Object.entries(validArgs).filter(([_, value]) => value !== undefined)
    );
    const project = await this.client.createProject(cleanArgs as any);
    return {
      content: [{
        type: "text",
        text: `Project created successfully:\n${this.formatProject(project)}`,
      }],
      isError: false,
    };
  }

  private async handleUpdateProject(args: any) {
    const { id, ...updates } = args;
    // Remove undefined values to avoid API issues
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    const project = await this.client.updateProject(id, cleanUpdates as any);
    return {
      content: [{
        type: "text",
        text: `Project updated successfully:\n${this.formatProject(project)}`,
      }],
      isError: false,
    };
  }

  private async handleDeleteProject(args: any) {
    await this.client.deleteProject(args.id);
    return {
      content: [{
        type: "text",
        text: `Successfully deleted project (ID: ${args.id})`,
      }],
      isError: false,
    };
  }

  // Section handler implementations
  private async handleGetSections(args: any) {
    const sections = await this.client.getSections(args.project_id);
    const sectionList = sections.map(section => 
      `- ${section.name}\n  Project ID: ${section.project_id}\n  ID: ${section.id}`
    ).join('\n\n');
    return {
      content: [{
        type: "text",
        text: sections.length > 0 ? sectionList : "No sections found",
      }],
      isError: false,
    };
  }

  private async handleGetSection(args: any) {
    const section = await this.client.getSection(args.id);
    return {
      content: [{
        type: "text",
        text: `- ${section.name}\n  Project ID: ${section.project_id}\n  ID: ${section.id}`,
      }],
      isError: false,
    };
  }

  private async handleCreateSection(args: any) {
    const validArgs = SectionCreateSchema.parse(args);
    // Remove undefined values to avoid API issues
    const cleanArgs = Object.fromEntries(
      Object.entries(validArgs).filter(([_, value]) => value !== undefined)
    );
    const section = await this.client.createSection(cleanArgs as any);
    return {
      content: [{
        type: "text",
        text: `Section created successfully: ${section.name} (ID: ${section.id})`,
      }],
      isError: false,
    };
  }

  private async handleUpdateSection(args: any) {
    const { id, ...updates } = args;
    // Remove undefined values to avoid API issues
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    const section = await this.client.updateSection(id, cleanUpdates as any);
    return {
      content: [{
        type: "text",
        text: `Section updated successfully: ${section.name} (ID: ${section.id})`,
      }],
      isError: false,
    };
  }

  private async handleDeleteSection(args: any) {
    await this.client.deleteSection(args.id);
    return {
      content: [{
        type: "text",
        text: `Successfully deleted section (ID: ${args.id})`,
      }],
      isError: false,
    };
  }

  // Label handler implementations
  private async handleGetLabels(args: any) {
    const labels = await this.client.getLabels();
    const labelList = labels.map(label => 
      `- ${label.name}${label.color ? ` (${label.color})` : ''}${label.is_favorite ? ' ⭐' : ''}\n  ID: ${label.id}`
    ).join('\n\n');
    return {
      content: [{
        type: "text",
        text: labels.length > 0 ? labelList : "No labels found",
      }],
      isError: false,
    };
  }

  private async handleGetLabel(args: any) {
    const label = await this.client.getLabel(args.id);
    return {
      content: [{
        type: "text",
        text: `- ${label.name}${label.color ? ` (${label.color})` : ''}${label.is_favorite ? ' ⭐' : ''}\n  ID: ${label.id}`,
      }],
      isError: false,
    };
  }

  private async handleCreateLabel(args: any) {
    const validArgs = LabelCreateSchema.parse(args);
    // Remove undefined values to avoid API issues
    const cleanArgs = Object.fromEntries(
      Object.entries(validArgs).filter(([_, value]) => value !== undefined)
    );
    const label = await this.client.createLabel(cleanArgs as any);
    return {
      content: [{
        type: "text",
        text: `Label created successfully: ${label.name} (ID: ${label.id})`,
      }],
      isError: false,
    };
  }

  private async handleUpdateLabel(args: any) {
    const { id, ...updates } = args;
    // Remove undefined values to avoid API issues
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    const label = await this.client.updateLabel(id, cleanUpdates as any);
    return {
      content: [{
        type: "text",
        text: `Label updated successfully: ${label.name} (ID: ${label.id})`,
      }],
      isError: false,
    };
  }

  private async handleDeleteLabel(args: any) {
    await this.client.deleteLabel(args.id);
    return {
      content: [{
        type: "text",
        text: `Successfully deleted label (ID: ${args.id})`,
      }],
      isError: false,
    };
  }

  // Comment handler implementations
  private async handleGetComments(args: any) {
    const comments = await this.client.getComments(args.task_id, args.project_id);
    const commentList = comments.map(comment => 
      `- ${comment.content}\n  Posted: ${comment.posted_at}\n  ID: ${comment.id}`
    ).join('\n\n');
    return {
      content: [{
        type: "text",
        text: comments.length > 0 ? commentList : "No comments found",
      }],
      isError: false,
    };
  }

  private async handleGetComment(args: any) {
    const comment = await this.client.getComment(args.id);
    return {
      content: [{
        type: "text",
        text: `- ${comment.content}\n  Posted: ${comment.posted_at}\n  ID: ${comment.id}`,
      }],
      isError: false,
    };
  }

  private async handleCreateComment(args: any) {
    const validArgs = CommentCreateSchema.parse(args);
    // Remove undefined values to avoid API issues
    const cleanArgs = Object.fromEntries(
      Object.entries(validArgs).filter(([_, value]) => value !== undefined)
    );
    const comment = await this.client.createComment(cleanArgs as any);
    return {
      content: [{
        type: "text",
        text: `Comment created successfully (ID: ${comment.id})`,
      }],
      isError: false,
    };
  }

  private async handleUpdateComment(args: any) {
    const comment = await this.client.updateComment(args.id, args.content);
    return {
      content: [{
        type: "text",
        text: `Comment updated successfully (ID: ${comment.id})`,
      }],
      isError: false,
    };
  }

  private async handleDeleteComment(args: any) {
    await this.client.deleteComment(args.id);
    return {
      content: [{
        type: "text",
        text: `Successfully deleted comment (ID: ${args.id})`,
      }],
      isError: false,
    };
  }

  // Search handler implementations
  private async handleSearchTasks(args: any) {
    const tasks = await this.client.getTasks();
    const filteredTasks = tasks.filter(task => 
      task.content.toLowerCase().includes(args.query.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(args.query.toLowerCase()))
    );

    // Apply limit
    const limitedTasks = args.limit ? filteredTasks.slice(0, args.limit) : filteredTasks;
    const taskList = limitedTasks.map(task => this.formatTask(task)).join('\n\n');

    return {
      content: [{
        type: "text",
        text: filteredTasks.length > 0 ? 
          `Found ${filteredTasks.length} task(s) matching "${args.query}":\n\n${taskList}` :
          `No tasks found matching "${args.query}"`,
      }],
      isError: false,
    };
  }

  private async handleFindTaskByName(args: any) {
    const tasks = await this.client.getTasks();
    const matchingTasks = tasks.filter(task => 
      task.content.toLowerCase().includes(args.task_name.toLowerCase())
    );

    if (matchingTasks.length === 0) {
      return {
        content: [{
          type: "text",
          text: `Could not find a task matching "${args.task_name}"`,
        }],
        isError: true,
      };
    }

    const taskList = matchingTasks.map(task => this.formatTask(task)).join('\n\n');
    return {
      content: [{
        type: "text",
        text: `Found ${matchingTasks.length} task(s) matching "${args.task_name}":\n\n${taskList}`,
      }],
      isError: false,
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Enhanced Todoist MCP Server running on stdio");
  }
}

// Run the server
async function main() {
  try {
    const server = new EnhancedTodoistMCPServer();
    await server.run();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
  });
}

export { EnhancedTodoistMCPServer };
