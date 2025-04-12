/**
 * GitHub Project Management MCP Server
 * This file implements a Model Context Protocol (MCP) server that provides tools for
 * interacting with GitHub Projects V2 API. It enables project management operations
 * like viewing projects, managing issues, and updating project items.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server instance with metadata
const server = new McpServer({
  name: "GitHub Project Management MCP Server",
  version: "1.0.0"
});

/**
 * Helper function to execute GraphQL queries against GitHub's API
 * @param query - The GraphQL query string
 * @param variables - Variables to be passed to the query
 * @returns Promise containing the query response
 * @throws Error if GITHUB_TOKEN is not set or if the API request fails
 */
async function executeGitHubGraphQL(query: string, variables = {}) {
  try {
    const token = Deno.env.get("GITHUB_TOKEN");
    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is not set");
    }

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("GraphQL query error:", error);
    throw error;
  }
}

/**
 * Retrieves the currently authenticated GitHub user's information
 * @returns Promise containing the user's login name
 */
async function getCurrentUser() {
  const userQuery = `
    query GetCurrentUser {
      viewer {
        id
        login
      }
    }
  `;
  const userData = await executeGitHubGraphQL(userQuery, {});
  return userData.data.viewer.login;
}

/**
 * Retrieves a project's ID given an organization and project name
 * @param organization - The GitHub organization name
 * @param projectName - The name of the project to find
 * @returns Promise containing the project ID
 */
async function getProjectId(organization: string, projectName: string) {
  const query = `
    query GetOrganizationProjects($org: String!, $projectName: String!) {
      organization(login: $org) {
        projectsV2(first: 10, query: $projectName) {
          nodes {
            id
            title
          }
        }
      }
    }
  `;

  const data = await executeGitHubGraphQL(query, { org: organization, projectName });
  return data.data.organization.projectsV2.nodes[0].id;
}

/**
 * Tool: Get Projects
 * Retrieves all ProjectsV2 for a given organization
 * Returns project details including ID, title, description, and metadata
 */
server.tool(
  "get_github_projects",
  { organization: z.string() },
  async ({ organization }) => {
    const query = `
      query GetOrganizationProjects($org: String!) {
        organization(login: $org) {
          projectsV2(first: 20) {
            nodes {
              id
              title
              shortDescription
              url
              closed
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const data = await executeGitHubGraphQL(query, { org: organization });
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }
);

/**
 * Tool: Get Project Details
 * Retrieves detailed information about a specific project including:
 * - Project metadata (title, description, URL)
 * - Project items (issues and PRs)
 * - Field configurations
 * - Custom fields and their values
 */
server.tool(
  "get_project_details",
  { projectId: z.string() },
  async ({ projectId }) => {
    const query = `
      query GetProjectDetails($id: ID!) {
        node(id: $id) {
          ... on ProjectV2 {
            id
            title
            shortDescription
            url
            closed
            createdAt
            updatedAt
            readme
            items(first: 20) {
              nodes {
                id
                content {
                  ... on Issue {
                    title
                    url
                    state
                  }
                  ... on PullRequest {
                    title
                    url
                    state
                  }
                }
                fieldValues(first: 8) {
                  nodes {
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
            fields(first: 20) {
              nodes {
                ... on ProjectV2FieldCommon {
                  id
                  name
                }
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                    color
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await executeGitHubGraphQL(query, { id: projectId });
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }
);

/**
 * Tool: Get Repository Issues
 * Retrieves issues from a specified repository with filtering options
 * Includes detailed issue information like labels, assignees, and project associations
 */
server.tool(
  "get_repository_issues",
  { 
    owner: z.string(),
    repo: z.string(),
    states: z.enum(["OPEN", "CLOSED", "ALL"]).default("OPEN"),
    first: z.number().min(1).max(100).default(20)
  },
  async ({ owner, repo, states, first }) => {
    const query = `
      query GetRepositoryIssues($owner: String!, $repo: String!, $states: [IssueState!], $first: Int!) {
        repository(owner: $owner, name: $repo) {
          issues(first: $first, states: $states, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              id
              number
              title
              state
              createdAt
              updatedAt
              url
              author {
                login
              }
              labels(first: 10) {
                nodes {
                  name
                  color
                }
              }
              assignees(first: 5) {
                nodes {
                  login
                  avatarUrl
                }
              }
              projectsV2(first: 10) {
                nodes {
                  id
                  title
                }
              }
            }
          }
        }
      }
    `;

    const issueStates = states === "ALL" ? ["OPEN", "CLOSED"] : [states];
    const data = await executeGitHubGraphQL(query, { owner, repo, states: issueStates, first });
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }
);

/**
 * Tool: Get Repository Pull Requests
 * Retrieves pull requests from a specified repository with filtering options
 * Includes PR details, review status, labels, and project associations
 */
server.tool(
  "get_repository_pull_requests",
  { 
    owner: z.string(), 
    repo: z.string(),
    states: z.enum(["OPEN", "CLOSED", "MERGED", "ALL"]).default("OPEN"),
    first: z.number().min(1).max(100).default(20)
  },
  async ({ owner, repo, states, first }) => {
    const query = `
      query GetRepositoryPullRequests($owner: String!, $repo: String!, $states: [PullRequestState!], $first: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequests(first: $first, states: $states, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              id
              number
              title
              state
              createdAt
              updatedAt
              url
              author {
                login
              }
              labels(first: 10) {
                nodes {
                  name
                  color
                }
              }
              assignees(first: 5) {
                nodes {
                  login
                  avatarUrl
                }
              }
              reviews(first: 10) {
                nodes {
                  author {
                    login
                  }
                  state
                }
              }
              projectsV2(first: 10) {
                nodes {
                  id
                  title
                }
              }
            }
          }
        }
      }
    `;

    const prStates = states === "ALL" ? ["OPEN", "CLOSED", "MERGED"] : [states];
    const data = await executeGitHubGraphQL(query, { owner, repo, states: prStates, first });
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }
);

/**
 * Tool: Add Item to Project
 * Adds either an existing issue/PR or creates a new draft issue in a project
 * Supports both content linking and draft issue creation
 */
server.tool(
  "add_item_to_project",
  { 
    organization: z.string(),
    projectName: z.string(),
    projectId: z.string().optional(),
    contentId: z.string().optional(),
    title: z.string().optional(),
    body: z.string().optional()
  },
  async ({ organization, projectName, projectId, contentId, title, body }) => {

    if (!projectId) {
      projectId = await getProjectId(organization, projectName);
    }

    let mutation;
    let variables;

    if (contentId) {
      // Adding existing issue/PR to project
      mutation = `
        mutation AddProjectItem($input: AddProjectV2ItemByIdInput!) {
          addProjectV2ItemById(input: $input) {
            item {
              id
            }
          }
        }
      `;
      variables = {
        input: {
          projectId,
          contentId
        }
      };
    } else if (title) {
      // Adding draft issue to project
      mutation = `
        mutation AddDraftIssue($input: AddProjectV2DraftIssueInput!) {
          addProjectV2DraftIssue(input: $input) {
            projectItem {
              id
            }
          }
        }
      `;
      variables = {
        input: {
          projectId,
          title,
          body: body || ""
        }
      };
    } else {
      throw new Error("Either contentId or title must be provided");
    }

    const data = await executeGitHubGraphQL(mutation, variables);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }
);

/**
 * Tool: Update Project Item Field
 * Updates a specific field value for an item in a project
 * Used for updating status, custom fields, or other project-specific data
 */
server.tool(
  "update_project_item_field",
  { 
    projectId: z.string(), 
    itemId: z.string(),
    fieldId: z.string(),
    value: z.string()
  },
  async ({ projectId, itemId, fieldId, value }) => {
    const mutation = `
      mutation UpdateProjectItemField($input: UpdateProjectV2ItemFieldValueInput!) {
        updateProjectV2ItemFieldValue(input: $input) {
          projectV2Item {
            id
          }
        }
      }
    `;

    const variables = {
      input: {
        projectId,
        itemId,
        fieldId,
        value
      }
    };

    const data = await executeGitHubGraphQL(mutation, variables);
    console.log(data);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }
);

/**
 * Tool: Get Repositories
 * Retrieves repositories for either a user or organization
 * Returns repository metadata including stars, forks, and update times
 */
server.tool(
  "get_repositories",
  { 
    owner: z.string(),
    isOrg: z.boolean().default(false),
    first: z.number().min(1).max(100).default(20)
  },
  async ({ owner, isOrg, first }) => {
    const query = isOrg 
      ? `
        query GetOrgRepos($owner: String!, $first: Int!) {
          organization(login: $owner) {
            repositories(first: $first, orderBy: {field: UPDATED_AT, direction: DESC}) {
              nodes {
                id
                name
                description
                url
                stargazerCount
                forkCount
                isPrivate
                updatedAt
              }
            }
          }
        }
      `
      : `
        query GetUserRepos($owner: String!, $first: Int!) {
          user(login: $owner) {
            repositories(first: $first, orderBy: {field: UPDATED_AT, direction: DESC}) {
              nodes {
                id
                name
                description
                url
                stargazerCount
                forkCount
                isPrivate
                updatedAt
              }
            }
          }
        }
      `;

    const data = await executeGitHubGraphQL(query, { owner, first });
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }
);

/**
 * Tool: Get Project Views
 * Retrieves all views configured for a specific project
 * Includes view layouts and field configurations
 */
server.tool(
  "get_project_views",
  { projectId: z.string() },
  async ({ projectId }) => {
    const query = `
      query GetProjectViews($id: ID!) {
        node(id: $id) {
          ... on ProjectV2 {
            views(first: 10) {
              nodes {
                id
                name
                layout
                fields {
                  ... on ProjectV2FieldCommon {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await executeGitHubGraphQL(query, { id: projectId });
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  }
);

// Initialize the server transport layer and start listening for messages
const transport = new StdioServerTransport();
await server.connect(transport);

console.log("GitHub Project Management MCP Server started");

