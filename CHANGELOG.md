# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-06-14

### Added
- Complete rewrite with comprehensive Todoist API v2 support
- **Project Management**: Full CRUD operations for projects with hierarchy support
- **Section Management**: Create and organize sections within projects
- **Label Management**: Complete label system with colors and favorites
- **Comment System**: Add, update, and delete comments on tasks and projects
- **Advanced Search**: Search tasks by content with natural language queries
- **Rate Limiting**: Token bucket implementation to respect API limits
- **Type Safety**: Full TypeScript implementation with Zod validation schemas
- **Error Handling**: Comprehensive error handling with detailed messages
- **Backward Compatibility**: Maintains compatibility with existing MCP tools

### Enhanced
- **Task Operations**: Extended task creation with full API parameter support
- **Filtering**: Support for Todoist's advanced filter syntax
- **Tool Descriptions**: Detailed descriptions for better LLM understanding
- **Performance**: Optimized API calls and response formatting

### Technical Improvements
- Migrated from Sync API to REST API v2 for better performance
- Added comprehensive TypeScript types for all Todoist resources
- Implemented input validation with Zod schemas
- Added rate limiting to prevent API quota issues
- Enhanced error messages with actionable guidance

### Tools Added
- `todoist_get_projects` - Retrieve all projects
- `todoist_get_project` - Get specific project by ID
- `todoist_create_project` - Create new project with options
- `todoist_update_project` - Update project settings
- `todoist_delete_project` - Delete project
- `todoist_get_sections` - Get sections by project
- `todoist_get_section` - Get specific section
- `todoist_create_section` - Create section in project
- `todoist_update_section` - Update section name
- `todoist_delete_section` - Delete section
- `todoist_get_labels` - Get all labels
- `todoist_get_label` - Get specific label
- `todoist_create_label` - Create new label
- `todoist_update_label` - Update label properties
- `todoist_delete_label` - Delete label
- `todoist_get_comments` - Get comments for task/project
- `todoist_get_comment` - Get specific comment
- `todoist_create_comment` - Add comment
- `todoist_update_comment` - Update comment
- `todoist_delete_comment` - Delete comment
- `todoist_search_tasks` - Search tasks by content
- `todoist_reopen_task` - Reopen completed tasks

### Developer Experience
- Added comprehensive README with examples
- Created test connection script for setup verification
- Added TypeScript configuration for strict type checking
- Included development scripts for building and testing
- Added MCP inspector integration for debugging

### Documentation
- Complete API documentation with examples
- Setup and configuration guide
- Troubleshooting section
- Filter syntax reference
- Contributing guidelines

## [1.0.0] - Previous Version

### Features (Legacy)
- Basic task CRUD operations
- Simple task filtering
- Project assignment
- Due date support
- Priority levels

### Notes
- Used older API patterns
- Limited error handling
- Basic filtering capabilities
- Minimal type safety
