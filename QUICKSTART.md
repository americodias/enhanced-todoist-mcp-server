# Quick Start Guide

Get your Enhanced Todoist MCP Server running in 5 minutes!

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd /Users/adias/Dev/enhanced-todoist-mcp-server
npm install
```

### 2. Get Your Todoist API Token
1. Go to [Todoist Integrations](https://todoist.com/prefs/integrations)
2. Scroll down to "API token" section
3. Copy your token

### 3. Test Your Connection
```bash
export TODOIST_API_TOKEN=your_token_here
npm run test-connection
```

### 4. Build the Project
```bash
npm run build
```

### 5. Configure Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "enhanced-todoist": {
      "command": "node",
      "args": ["/Users/adias/Dev/enhanced-todoist-mcp-server/build/index.js"],
      "env": {
        "TODOIST_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### 6. Restart Claude Desktop

Close and reopen Claude Desktop to load the new MCP server.

## ✅ Test It Works

Try these commands in Claude:

1. **"Show me my tasks for today"**
2. **"Create a task 'Test MCP integration' due tomorrow"**
3. **"Show me all my projects"**
4. **"Create a new project called 'MCP Testing'"**

## 🔧 Troubleshooting

### "No tools available"
- Check that Claude Desktop was restarted
- Verify the path in `claude_desktop_config.json` is correct
- Make sure the build was successful

### "API Error 401"
- Your API token is invalid or expired
- Get a fresh token from Todoist settings

### "Rate limit exceeded"
- Wait 15 minutes for limits to reset
- The server automatically handles rate limiting

## 🎯 What's New vs Original

### Original Todoist MCP Server
- ✅ Basic task CRUD
- ❌ No projects management
- ❌ No sections or labels
- ❌ Limited filtering
- ❌ Basic error handling

### Enhanced Version (This Package)
- ✅ Complete task management
- ✅ Full project management with hierarchy
- ✅ Sections and labels support
- ✅ Advanced filtering with natural language
- ✅ Comments and collaboration
- ✅ Rate limiting and error handling
- ✅ Type-safe operations
- ✅ Search functionality
- ✅ 25+ tools available

## 📚 Next Steps

1. Read the full [README.md](README.md) for detailed usage
2. Check the [CHANGELOG.md](CHANGELOG.md) for version history
3. Explore all available tools with natural language commands
4. Customize the server for your specific workflow needs

## 🆘 Need Help?

- Review the troubleshooting section in README.md
- Check the Todoist API documentation
- Use the test connection script to diagnose issues
- Open an issue on GitHub if you find bugs

Happy task management with Claude! 🎉
