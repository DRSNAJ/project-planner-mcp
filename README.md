# GitHub Project Management MCP Server

A comprehensive Model Context Protocol (MCP) server for GitHub project management tasks using the GitHub GraphQL API. This server enables AI assistants to interact with GitHub Projects, Issues, Pull Requests, and more through Cursor IDE.

## Overview

This MCP server provides a bridge between AI assistants and GitHub's project management features. It enables automated interaction with:
- GitHub Projects V2
- Issues and Pull Requests
- Repository Management
- Project Views and Layouts

## Prerequisites

- [Cursor IDE](https://cursor.sh/) installed
- [Deno](https://deno.land/) runtime installed
- GitHub Personal Access Token with required permissions

## Setup in Cursor

1. Create a new GitHub Personal Access Token:
   - Go to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
   - Generate a new token with these permissions:
     - `repo` (Full control of private repositories)
     - `admin:org` (Full control of orgs and teams)
     - `project` (Full control of user and organization projects)
   - Copy your token

2. Clone this repository:
   ```bash
   git clone [repository-url]
   cd project-planner-mcp
   ```

3. Create or update your Cursor MCP configuration:
   - Open Cursor
   - Create/edit `~/.cursor/mcp.json` with this configuration:
   ```json
   {
     "github-projects": {
       "command": "deno",
       "args": [
         "run",
         "--allow-env",
         "--allow-net",
         "[path-to-your-clone]/main.ts"
       ],
       "env": {
         "GITHUB_TOKEN": "your_github_token_here"
       }
     }
   }
   ```
   Replace `[path-to-your-clone]` with the absolute path to your cloned repository.

4. Restart Cursor to load the new MCP configuration

## Development

For local development and testing:

```bash
# Run with auto-reload
deno task dev

# Run directly
deno run --allow-env --allow-net main.ts
```

## Available Tools

### 1. Get GitHub Projects (`get_github_projects`)
Retrieves all projects for a GitHub organization.

**Parameters:**
- `organization`: string (required) - Organization login name

### 2. Get Project Details (`get_project_details`)
Fetches comprehensive project information including items, fields, and metadata.

**Parameters:**
- `projectId`: string (required) - Project ID

### 3. Get Repository Issues (`get_repository_issues`)
Retrieves filtered repository issues.

**Parameters:**
- `owner`: string (required) - Repository owner
- `repo`: string (required) - Repository name
- `states`: "OPEN" | "CLOSED" | "ALL" (default: "OPEN")
- `first`: number (1-100, default: 20)

### 4. Get Repository Pull Requests (`get_repository_pull_requests`)
Retrieves filtered repository pull requests.

**Parameters:**
- `owner`: string (required) - Repository owner
- `repo`: string (required) - Repository name
- `states`: "OPEN" | "CLOSED" | "MERGED" | "ALL" (default: "OPEN")
- `first`: number (1-100, default: 20)

### 5. Add Item to Project (`add_item_to_project`)
Adds items to a project or creates draft issues.

**Parameters:**
- `organization`: string (required) - Organization name
- `projectName`: string (required) - Project name
- `projectId`: string (optional) - Project ID (if known)
- `contentId`: string (optional) - ID of issue/PR to add
- `title`: string (optional) - Title for draft issue
- `body`: string (optional) - Body for draft issue

### 6. Update Project Item Field (`update_project_item_field`)
Updates field values for project items.

**Parameters:**
- `projectId`: string (required) - Project ID
- `itemId`: string (required) - Item ID
- `fieldId`: string (required) - Field ID
- `value`: string (required) - New field value

### 7. Get Repositories (`get_repositories`)
Lists repositories for a user or organization.

**Parameters:**
- `owner`: string (required) - User/org login name
- `isOrg`: boolean (default: false)
- `first`: number (1-100, default: 20)

### 8. Get Project Views (`get_project_views`)
Retrieves project view configurations.

**Parameters:**
- `projectId`: string (required) - Project ID

## Usage in Cursor

1. Open Cursor and ensure you're in a workspace
2. Use the `/mcp` command to interact with GitHub projects
3. Example commands:
   ```
   /mcp get_github_projects organization="your-org"
   /mcp get_repository_issues owner="your-org" repo="your-repo"
   ```

## Error Handling

Common errors and solutions:
- `GITHUB_TOKEN not set`: Check your MCP configuration
- `Not authorized`: Verify token permissions
- `Resource not found`: Check organization/repo names
- `Invalid project ID`: Ensure project exists and is accessible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Error messages 