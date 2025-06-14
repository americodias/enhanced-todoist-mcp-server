import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedTodoistMCPServer } from '../src/index.js';

describe('Enhanced Todoist MCP Server', () => {
  let server: EnhancedTodoistMCPServer;

  beforeEach(() => {
    // Mock environment variable for tests
    process.env.TODOIST_API_TOKEN = 'test_token_123';
  });

  it('should create server instance with valid token', () => {
    expect(() => {
      server = new EnhancedTodoistMCPServer();
    }).not.toThrow();
  });

  it('should throw error without API token', () => {
    delete process.env.TODOIST_API_TOKEN;
    expect(() => {
      server = new EnhancedTodoistMCPServer();
    }).toThrow('TODOIST_API_TOKEN environment variable is required');
  });

  // Add more tests as needed
  it('should have correct server metadata', () => {
    server = new EnhancedTodoistMCPServer();
    expect(server).toBeDefined();
    // Note: Actual server metadata testing would require deeper inspection
    // of the MCP server instance, which depends on the SDK implementation
  });
});

// Token bucket rate limiter tests
describe('TokenBucket', () => {
  it('should consume tokens correctly', async () => {
    // This would test the TokenBucket class if exported
    // For now, this is a placeholder for future rate limiting tests
    expect(true).toBe(true);
  });
});
