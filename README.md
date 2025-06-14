# Enhanced Todoist MCP Server

A comprehensive Model Context Protocol (MCP) server for Todoist integration that provides Claude with full access to Todoist's API capabilities including tasks, projects, sections, labels, and comments.

## Features

### ✅ Complete Task Management
- Create, read, update, delete, and complete tasks
- Advanced filtering using Todoist's natural language syntax
- Support for priorities, labels, due dates, and descriptions
- Task search functionality
- Subtask support

### 📁 Project Management
- Full project CRUD operations
- Project hierarchy support
- Custom colors and view styles (list/board)
- Favorite projects

### 📋 Section Organization
- Create and manage sections within projects
- Organize tasks by sections
- Section ordering

### 🏷️ Label System
- Create and manage labels
- Apply multiple labels to tasks
- Label colors and favorites
- Cross-project labeling

### 💬 Comments & Collaboration
- Add comments to tasks and projects
- Update and delete comments
- Attachment support

### 🔍 Advanced Search
- Natural language task filtering
- Search tasks by content
- Complex filter queries

### ⚡ Performance Features
- Rate limiting to respect API limits
- Comprehensive error handling
- Type-safe operations with Zod validation
- RESTful API v2 support

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Todoist account with API access

### Quick Install

1. Clone or create the project:
```bash
git clone <your-repo-url>
cd enhanced-todoist-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Get your Todoist API token:
   - Log in to Todoist
   - Go to Settings → Integrations
   - Copy your API token

### Claude Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "enhanced-todoist": {
      "command": "node",
      "args": ["/absolute/path/to/enhanced-todoist-mcp-server/build/index.js"],
      "env": {
        "TODOIST_API_TOKEN": "your_todoist_api_token_here"
      }
    }
  }
}
```

Or use npx for automatic updates:

```json
{
  "mcpServers": {
    "enhanced-todoist": {
      "command": "npx",
      "args": ["enhanced-todoist-mcp-server"],
      "env": {
        "TODOIST_API_TOKEN": "your_todoist_api_token_here"
      }
    }
  }
}
```

## Documentation

- **[Complete User Guide](USER_GUIDE.md)** - Extensive documentation with 500+ practical examples for daily life scenarios
- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
- **[Changelog](CHANGELOG.md)** - Version history and updates

## Usage Examples

### Basic Task Operations

```
"Create a task 'Review quarterly reports' due tomorrow with high priority"
"Show me all tasks due today"
"Mark the meeting preparation task as complete"
"Update the budget review task to be due next Friday"
```

### Project Management

```
"Create a new project called 'Website Redesign' with board view"
"Show me all my projects"
"Add a section called 'In Progress' to the Website Redesign project"
```

### Advanced Filtering

```
"Show me all high priority tasks in the Work project"
"Find tasks with the @urgent label that are overdue"
"Get all tasks assigned to me in the next week"
```

### Labels and Organization

```
"Create a label called 'Quick Wins' with green color"
"Add the @important label to the budget task"
"Show me all tasks with the @waiting label"
```

### Comments and Collaboration

```
"Add a comment to the project planning task: 'Need to schedule stakeholder meeting'"
"Show me all comments on the Website Redesign project"
```

## Available Tools

### Task Management
- `todoist_get_tasks` - Retrieve tasks with advanced filtering
- `todoist_get_task` - Get specific task by ID
- `todoist_create_task` - Create new task with full options
- `todoist_update_task` - Update existing task
- `todoist_complete_task` - Mark task as complete
- `todoist_reopen_task` - Reopen completed task
- `todoist_delete_task` - Delete task
- `todoist_search_tasks` - Search tasks by content
- `todoist_find_task_by_name` - Find task by name (legacy compatibility)

### Project Management
- `todoist_get_projects` - Get all projects
- `todoist_get_project` - Get specific project
- `todoist_create_project` - Create new project
- `todoist_update_project` - Update project settings
- `todoist_delete_project` - Delete project

### Section Management
- `todoist_get_sections` - Get sections (optionally by project)
- `todoist_get_section` - Get specific section
- `todoist_create_section` - Create new section
- `todoist_update_section` - Update section
- `todoist_delete_section` - Delete section

### Label Management
- `todoist_get_labels` - Get all labels
- `todoist_get_label` - Get specific label
- `todoist_create_label` - Create new label
- `todoist_update_label` - Update label
- `todoist_delete_label` - Delete label

### Comment Management
- `todoist_get_comments` - Get comments for task/project
- `todoist_get_comment` - Get specific comment
- `todoist_create_comment` - Add new comment
- `todoist_update_comment` - Update comment
- `todoist_delete_comment` - Delete comment

## Filter Syntax

The server supports Todoist's powerful filter syntax:

### Date Filters
- `today` - Tasks due today
- `tomorrow` - Tasks due tomorrow
- `this week` - Tasks due this week
- `next week` - Tasks due next week
- `overdue` - Overdue tasks
- `no date` - Tasks with no due date

### Priority Filters
- `p1` - Priority 4 (highest)
- `p2` - Priority 3
- `p3` - Priority 2
- `p4` - Priority 1 (lowest)

### Label Filters
- `@work` - Tasks with "work" label
- `@home` - Tasks with "home" label

### Project Filters
- `#project_name` - Tasks in specific project

### Complex Filters
- `today & p1` - High priority tasks due today
- `@work & overdue` - Overdue work tasks
- `(today | tomorrow) & p1` - High priority tasks due today or tomorrow

## Development

### Scripts
- `npm run build` - Build the TypeScript project
- `npm run dev` - Watch mode for development
- `npm start` - Run the built server
- `npm test` - Run tests
- `npm run inspect` - Run MCP inspector for debugging
- `npm run clean` - Clean build directory

### Project Structure
```
enhanced-todoist-mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── build/                # Compiled JavaScript output
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Debugging

Use the MCP inspector to test tools:

```bash
npm run inspect
```

This will start an interactive debugger where you can test individual tools.

## API Compatibility

This server uses Todoist's REST API v2, which provides:
- Better performance than the legacy Sync API
- Comprehensive resource coverage
- Modern RESTful design
- Full type safety

## Rate Limiting

The server implements automatic rate limiting to respect Todoist's API limits:
- 1000 requests per 15 minutes
- Automatic backoff and retry
- Request queuing during limit periods

## Error Handling

Comprehensive error handling includes:
- Input validation with Zod schemas
- API error translation
- Rate limit management
- Detailed error messages for debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the [Todoist API documentation](https://developer.todoist.com/rest/v2/)
2. Review the MCP documentation
3. Open an issue on GitHub

## Changelog

### v2.0.0
- Complete rewrite with full API coverage
- Added projects, sections, labels, and comments
- Enhanced error handling and rate limiting
- Type-safe operations with Zod validation
- RESTful API v2 support
- Comprehensive search functionality
- Backward compatibility with existing tools
