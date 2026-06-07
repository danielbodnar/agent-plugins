# GitHub API Reference

Sync and organize 15,000+ GitHub starred repositories using REST API v3 and GraphQL API v4.

## Authentication

### Personal Access Token (Classic)

**Required scopes:**
- `public_repo` or `repo` (for starred repositories)
- `read:user` (for user information)

**Create token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `public_repo`, `read:user`
4. Generate and copy token

**Environment variable:**
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## REST API v3

### Get User's Starred Repositories

```typescript
interface StarredRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  archived: boolean;
  fork: boolean;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

async function getStarredRepos(
  username: string,
  token: string
): Promise<StarredRepo[]> {
  const repos: StarredRepo[]= [];
  let page = 1;
  const perPage = 100;
  
  while (true) {
    const response = await fetch(
      `https://api.github.com/users/${username}/starred?per_page=${perPage}&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const batch = await response.json();
    if (batch.length === 0) break;
    
    repos.push(...batch);
    page++;
    
    // Rate limit handling
    const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
    if (remaining < 10) {
      const resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0') * 1000;
      const waitMs = resetTime - Date.now();
      if (waitMs > 0) {
        console.log(`Rate limit approaching, waiting ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }
  
  return repos;
}
```

### Get Repository Topics

```typescript
async function getRepoTopics(
  owner: string,
  repo: string,
  token: string
): Promise<string[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/topics`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    }
  );
  
  const data = await response.json();
  return data.names || [];
}
```

## GraphQL API v4 (Recommended for Bulk)

### Query Starred Repositories

**Advantages:**
- Single request for all data
- Reduced API calls (100 repos per request vs 1 per repo)
- More efficient for 15k+ stars

```typescript
const STARRED_REPOS_QUERY = `
  query($login: String!, $cursor: String) {
    user(login: $login) {
      starredRepositories(first: 100, after: $cursor, orderBy: {field: STARRED_AT, direction: DESC}) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          name
          nameWithOwner
          description
          url
          homepageUrl
          primaryLanguage {
            name
            color
          }
          repositoryTopics(first: 20) {
            nodes {
              topic {
                name
              }
            }
          }
          stargazerCount
          forkCount
          openIssues: issues(states: OPEN) {
            totalCount
          }
          createdAt
          updatedAt
          pushedAt
          isArchived
          isFork
          owner {
            login
            avatarUrl
            url
          }
        }
      }
    }
  }
`;

async function getStarredReposGraphQL(
  username: string,
  token: string
): Promise<StarredRepo[]> {
  const repos: StarredRepo[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  
  while (hasNextPage) {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: STARRED_REPOS_QUERY,
        variables: { login: username, cursor },
      }),
    });
    
    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }
    
    const starredRepos = data.data.user.starredRepositories;
    const nodes = starredRepos.nodes;
    
    for (const node of nodes) {
      repos.push({
        id: parseInt(node.id.replace('Repository_', '')),
        name: node.name,
        full_name: node.nameWithOwner,
        description: node.description,
        html_url: node.url,
        homepage: node.homepageUrl,
        language: node.primaryLanguage?.name || null,
        topics: node.repositoryTopics.nodes.map((t: any) => t.topic.name),
        stargazers_count: node.stargazerCount,
        forks_count: node.forkCount,
        open_issues_count: node.openIssues.totalCount,
        created_at: node.createdAt,
        updated_at: node.updatedAt,
        pushed_at: node.pushedAt,
        archived: node.isArchived,
        fork: node.isFork,
        owner: {
          login: node.owner.login,
          avatar_url: node.owner.avatarUrl,
          url: node.owner.url,
        },
      });
    }
    
    hasNextPage = starredRepos.pageInfo.hasNextPage;
    cursor = starredRepos.pageInfo.endCursor;
    
    console.log(`Fetched ${repos.length}/${starredRepos.totalCount} stars...`);
  }
  
  return repos;
}
```

## Complete Implementation

```typescript
import { z } from 'zod';

const GitHubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  html_url: z.string().url(),
  homepage: z.string().url().nullable(),
  language: z.string().nullable(),
  topics: z.array(z.string()),
  stargazers_count: z.number(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string(),
  archived: z.boolean(),
  fork: z.boolean(),
  owner: z.object({
    login: z.string(),
    avatar_url: z.string().url(),
    html_url: z.string().url(),
  }),
});

export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

export class GitHubStarSync {
  private token: string;
  private username: string;
  
  constructor(config: { token: string; username: string }) {
    this.token = config.token;
    this.username = config.username;
  }
  
  async syncStars(): Promise<GitHubRepo[]> {
    console.log(`Syncing starred repositories for ${this.username}...`);
    
    const repos = await getStarredReposGraphQL(this.username, this.token);
    
    console.log(`Synced ${repos.length} starred repositories`);
    
    return repos.map(repo => GitHubRepoSchema.parse(repo));
  }
  
  async classifyAndOrganize(
    repos: GitHubRepo[],
    classifier: HybridClassifier
  ): Promise<ClassifiedRepo[]> {
    console.log(`Classifying ${repos.length} repositories...`);
    
    const classified = await batchOperation(
      repos,
      async (batch) => {
        return await Promise.all(
          batch.map(async (repo) => {
            const bookmark = this.repoToBookmark(repo);
            const classification = await classifier.classify(bookmark);
            
            return {
              ...repo,
              category: classification.category,
              confidence: classification.confidence,
            };
          })
        );
      },
      { batchSize: 50, delayMs: 100 }
    );
    
    return classified;
  }
  
  private repoToBookmark(repo: GitHubRepo): Bookmark {
    return {
      url: repo.html_url,
      title: repo.full_name,
      description: repo.description || undefined,
      tags: [
        ...repo.topics,
        repo.language || 'Unknown',
        repo.archived ? 'archived' : 'active',
      ],
    };
  }
}
```

## Rate Limiting

### REST API v3
- **Limit:** 5,000 requests/hour (authenticated)
- **Per-page:** 100 items max
- **Headers:**
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

### GraphQL API v4
- **Limit:** 5,000 points/hour
- **Cost per query:** ~1 point per 100 repos
- **More efficient for bulk operations**

### Rate Limit Handling

```typescript
async function handleRateLimit(response: Response): Promise<void> {
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '5000');
  const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '5000');
  const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0') * 1000;
  
  if (remaining < limit * 0.1) { // Less than 10% remaining
    const waitMs = reset - Date.now();
    if (waitMs > 0) {
      console.warn(`Rate limit low (${remaining}/${limit}), waiting ${Math.round(waitMs / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitMs + 1000));
    }
  }
}
```

## Export to Bookmarks

```typescript
async function exportStarsToBookmarks(
  stars: ClassifiedRepo[],
  config: Config
): Promise<void> {
  // Create "GitHub Stars" folder
  const githubFolder = await browser.bookmarks.create({
    title: 'GitHub Stars',
    parentId: config.chrome.bookmarksBarId,
  });
  
  // Group by category
  const byCategory = stars.reduce((acc, star) => {
    const category = star.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(star);
    return acc;
  }, {} as Record<string, ClassifiedRepo[]>);
  
  // Create category folders and bookmarks
  for (const [category, repos] of Object.entries(byCategory)) {
    const categoryFolder = await browser.bookmarks.create({
      title: category,
      parentId: githubFolder.id,
    });
    
    await batchOperation(
      repos,
      async (batch) => {
        for (const repo of batch) {
          await browser.bookmarks.create({
            title: repo.full_name,
            url: repo.html_url,
            parentId: categoryFolder.id,
          });
        }
        return [];
      },
      { batchSize: 100, delayMs: 50 }
    );
  }
  
  console.log(`Exported ${stars.length} GitHub stars to bookmarks`);
}
```

## Performance Tips

### For 15k+ Stars

1. **Use GraphQL API** - Fewer requests, more data per request
2. **Cache results** - Store in DuckDB, refresh daily/weekly
3. **Incremental sync** - Only fetch new/updated stars
4. **Batch processing** - Process 100-500 repos at a time
5. **Parallel classification** - Use AI batch operations

### Expected Performance

| Operation | Time (15k stars) | API Calls |
|-----------|------------------|-----------|
| Fetch (REST) | 30-45 min | ~150 requests |
| Fetch (GraphQL) | 5-10 min | ~150 requests |
| Classify | 30-60 min | Depends on AI provider |
| Export to bookmarks | 5-10 min | ~150 requests |
| **Total** | **40-80 min** | ~450 requests |

## Summary

**Recommended approach for 15k+ stars:**

1. **Use GraphQL API** for fetching (faster, fewer requests)
2. **Cache locally** in DuckDB (refresh weekly)
3. **Classify with hybrid AI** (Gemini + Claude)
4. **Export to organized folders** by category
5. **Deduplicate** against existing bookmarks

**Configuration:**

```json
{
  "github": {
    "enabled": true,
    "sync_interval_hours": 24,
    "classify_new_stars": true,
    "merge_with_bookmarks": true,
    "dedupe_against_bookmarks": true
  }
}
```
