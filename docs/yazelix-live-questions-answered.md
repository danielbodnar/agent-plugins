# Yazelix Live: Direct Answers to Your Questions

## Question 1: GitHub Integration

**What's the best approach to load a public GitHub repo into the file tree and make files available to the editor?**

### Recommended Approach: Octokit with Lazy Loading

```typescript
// Use GitHub's Tree API for structure, Contents API for files
const loadRepo = async (owner: string, repo: string) => {
  // 1. Get default branch SHA
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  // 2. Get root tree (non-recursive for lazy loading)
  const { data: branch } = await octokit.repos.getBranch({
    owner, repo, branch: defaultBranch
  });

  // 3. Load root level only - children load on expand
  const { data: tree } = await octokit.git.getTree({
    owner, repo,
    tree_sha: branch.commit.sha,
    recursive: false  // KEY: Don't load everything at once
  });

  return tree.tree;
};
```

**Why this approach?**
- **Lazy loading**: Only fetch directory contents when user expands
- **Rate limit friendly**: 5000 requests/hour is plenty for on-demand loading
- **No backend needed**: Direct browser-to-GitHub API calls work
- **Caching**: Add 5-10 minute TTL cache to reduce API calls

**Implementation order**:
1. Add Octokit dependency
2. Create `GitHubService` class with tree/content methods
3. Replace hardcoded `fileTree` state with API calls
4. Add loading spinners on directory expansion
5. Fetch file content on tab open (not before)

---

## Question 2: Command Execution

**Should I prioritize WebSocket+PTY or start with Cloudflare Container exec API?**

### Recommendation: Start with WebContainers, then add WebSocket+PTY

| Priority | Backend | Why |
|----------|---------|-----|
| **1st** | WebContainers | Zero server setup, works today, good for Node.js |
| **2nd** | WebSocket+PTY | Full interactivity (vim, htop), requires server |
| **3rd** | Cloudflare Containers | Good for authenticated users, pay-per-use |

**WebContainers first because**:
- No server infrastructure needed
- Works immediately in browser
- Sufficient for 80% of use cases (npm, node, basic shell)
- Free during development

**Add WebSocket+PTY when you need**:
- Full interactive programs (vim, htop, top)
- Non-Node.js environments (Python, Rust, Go)
- Persistent sessions across page reloads
- Server-side processing power

**Skip Cloudflare Containers initially because**:
- `exec` API is non-interactive (no PTY)
- Adds complexity without full interactivity
- Better as a "headless" option later

### Quick Start with WebContainers

```bash
npm install @webcontainer/api
```

```typescript
import { WebContainer } from '@webcontainer/api';

// Boot once, reuse
const container = await WebContainer.boot();

// Mount files from GitHub
await container.mount(files);

// Start shell
const process = await container.spawn('jsh', {
  terminal: { cols: 80, rows: 24 }
});

// Stream output to xterm.js
process.output.pipeTo(new WritableStream({
  write(data) { terminal.write(data); }
}));

// Send input from xterm.js
terminal.onData(data => {
  const writer = process.input.getWriter();
  writer.write(data);
  writer.releaseLock();
});
```

---

## Question 3: Architecture

**How should the frontend communicate with the backend? REST + WebSocket? GraphQL?**

### Recommendation: REST + WebSocket Hybrid

```
Frontend
    │
    ├── REST ──────► File operations, repo loading, auth
    │                (stateless, cacheable)
    │
    └── WebSocket ──► Terminal I/O, real-time updates
                     (stateful, bidirectional)
```

**Why not pure WebSocket?**
- REST is simpler to debug, cache, and retry
- File operations don't need real-time
- GitHub API is REST anyway

**Why not GraphQL?**
- Overkill for this use case
- GitHub's GraphQL has same rate limits
- Adds complexity without clear benefit

**Protocol design**:

```typescript
// REST Endpoints
GET  /api/repos/{owner}/{repo}/tree     // File tree
GET  /api/repos/{owner}/{repo}/file     // File content
POST /api/sessions                       // Create terminal session

// WebSocket Messages
{ type: 'terminal:input', payload: { sessionId, data } }
{ type: 'terminal:output', payload: { sessionId, data } }
{ type: 'terminal:resize', payload: { sessionId, cols, rows } }
```

---

## Question 4: State Management

**How do I handle the transition from simulated to real data without breaking the UI?**

### Strategy: Backend Abstraction + Parallel Mode

**Step 1**: Define a common interface

```typescript
interface BackendProvider {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDirectory(path: string): Promise<DirectoryEntry[]>;
  exec(command: string): Promise<ExecResult>;
}
```

**Step 2**: Implement both backends

```typescript
class SimulatedBackend implements BackendProvider {
  // Your existing mock code
}

class GitHubBackend implements BackendProvider {
  // Real GitHub API calls
}
```

**Step 3**: Use a switcher during development

```typescript
const useBackend = () => {
  const [mode, setMode] = useState<'simulated' | 'real'>('simulated');

  const backend = useMemo(() => {
    return mode === 'simulated'
      ? new SimulatedBackend()
      : new GitHubBackend();
  }, [mode]);

  return { backend, mode, setMode };
};
```

**Step 4**: Add a dev toggle in UI

```tsx
{process.env.NODE_ENV === 'development' && (
  <button onClick={() => setMode(m => m === 'real' ? 'simulated' : 'real')}>
    Mode: {mode}
  </button>
)}
```

**Key principle**: UI code never knows which backend it's using. All access goes through the interface.

---

## Question 5: Performance

**What are the implications of loading large repos or running many commands?**

### Large Repos (1000+ files)

**Problems**:
- GitHub API returns max 100k tree entries (recursive)
- Loading everything upfront = slow + rate limit risk
- Rendering 1000+ tree nodes = React performance issues

**Solutions**:

1. **Never load full tree recursively**
   ```typescript
   // BAD: Loads everything
   await octokit.git.getTree({ recursive: true });

   // GOOD: Load on demand
   await octokit.repos.getContent({ path: clickedDir });
   ```

2. **Skip heavy directories**
   ```typescript
   const SKIP_PATTERNS = ['node_modules', '.git', 'dist', 'vendor'];
   const shouldLoad = (path) => !SKIP_PATTERNS.some(p => path.includes(p));
   ```

3. **Virtual scrolling for file tree**
   ```typescript
   import { useVirtualizer } from '@tanstack/react-virtual';
   // Only render visible nodes
   ```

4. **Limit concurrent loads**
   ```typescript
   const queue = new PQueue({ concurrency: 5 });
   await queue.add(() => loadFile(path));
   ```

### Many Commands

**Problems**:
- Terminal history grows unbounded
- WebSocket can flood with output
- Re-renders on every output chunk

**Solutions**:

1. **Cap history**
   ```typescript
   const MAX_LINES = 10000;
   if (history.length > MAX_LINES) {
     history = history.slice(-MAX_LINES);
   }
   ```

2. **Buffer output**
   ```typescript
   // Batch writes, flush every 16ms (60fps)
   const buffer = [];
   const flush = debounce(() => {
     terminal.write(buffer.join(''));
     buffer.length = 0;
   }, 16);

   socket.onmessage = (data) => {
     buffer.push(data);
     flush();
   };
   ```

3. **Use xterm.js** (handles performance internally)
   - Already optimized for large output
   - Built-in scrollback buffer management

---

## Quick Implementation Checklist

### Week 1: GitHub Integration
- [ ] Install `@octokit/rest`
- [ ] Create `GitHubService` with `getTree()` and `getContent()`
- [ ] Replace hardcoded file tree
- [ ] Add loading states to tree expansion
- [ ] Cache responses (5-min TTL)

### Week 2: WebContainers
- [ ] Install `@webcontainer/api`
- [ ] Mount GitHub files to container
- [ ] Connect xterm.js to container shell
- [ ] Sync editor saves to container filesystem

### Week 3: Polish
- [ ] Add error boundaries
- [ ] Implement fallback to simulated mode
- [ ] Add backend mode toggle
- [ ] Performance test with large repos

---

## Immediate Next Steps

1. **Install dependencies**:
   ```bash
   npm install @octokit/rest @webcontainer/api xterm xterm-addon-fit
   ```

2. **Create services folder**:
   ```
   src/
     services/
       github.ts      # Octokit wrapper
       container.ts   # WebContainer wrapper
       backend.ts     # BackendProvider interface
   ```

3. **Start with GitHub tree loading** - this gives visible progress immediately

4. **Keep simulated mode working** - never delete it, use as fallback
