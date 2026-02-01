# Yazelix Live Web Terminal: Backend Integration Plan

## Executive Summary

This document outlines the technical strategy for connecting the Yazelix Live Web Terminal React application to real backend services. The plan covers GitHub repository integration, command execution architectures, state management migration, and performance optimization.

**Target Architecture**: A web-based terminal environment that loads real GitHub repositories, executes real commands, and maintains the current UI/UX while transitioning from simulated to live data.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [GitHub Integration](#2-github-integration)
3. [Command Execution Backends](#3-command-execution-backends)
4. [Frontend-Backend Communication](#4-frontend-backend-communication)
5. [State Management Migration](#5-state-management-migration)
6. [Performance Optimization](#6-performance-optimization)
7. [Implementation Phases](#7-implementation-phases)
8. [Appendices](#appendices)

---

## 1. Architecture Overview

### 1.1 Current State (Simulated)

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
├──────────────┬──────────────────┬──────────────────────────┤
│  File Tree   │     Editor       │        Terminal          │
│  (hardcoded) │  (cached files)  │  (simulated commands)    │
└──────────────┴──────────────────┴──────────────────────────┘
```

### 1.2 Target State (Live)

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
├──────────────┬──────────────────┬──────────────────────────┤
│  File Tree   │     Editor       │        Terminal          │
└──────┬───────┴────────┬─────────┴────────────┬─────────────┘
       │                │                       │
       │ REST/GraphQL   │ REST/GraphQL          │ WebSocket
       │                │                       │
┌──────▼────────────────▼───────────────────────▼─────────────┐
│                   API Gateway / BFF                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│  GitHub Service │  File Service   │  Terminal Service       │
│  (Octokit)      │  (Cache Layer)  │  (PTY/Container)        │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### 1.3 Core Design Principles

| Principle | Description |
|-----------|-------------|
| **Progressive Enhancement** | Maintain simulated fallbacks during migration |
| **Lazy Loading** | Fetch files/directories on-demand, not eagerly |
| **Optimistic UI** | Update UI immediately, reconcile with backend |
| **Connection Resilience** | Handle disconnects gracefully with reconnection |
| **Abstraction Layer** | Single interface for multiple backend implementations |

---

## 2. GitHub Integration

### 2.1 Approach Comparison

| Approach | Latency | Rate Limits | Authentication | Complexity | Best For |
|----------|---------|-------------|----------------|------------|----------|
| **GitHub REST API (Octokit)** | ~200-500ms | 5000/hr (auth), 60/hr (unauth) | PAT, OAuth, GitHub App | Low | Public repos, simple trees |
| **GitHub GraphQL API** | ~100-300ms | 5000 points/hr | Same as REST | Medium | Complex queries, nested data |
| **git clone + serve** | ~5-30s initial | None after clone | SSH key or HTTPS | High | Full repo access, large files |
| **isomorphic-git** | ~2-10s initial | Uses GitHub API | Same as REST | Medium | Browser-only, no server |
| **GitHub Contents API + Cache** | ~50-200ms (cached) | Same as REST | Same as REST | Medium | Balanced approach |

### 2.2 Recommended Approach: Hybrid GitHub Integration

**Phase 1**: GitHub Contents API with intelligent caching
**Phase 2**: Add git clone for power users or large repos

#### 2.2.1 File Tree Loading (REST API)

```typescript
// Recommended: Octokit with tree endpoint for directory structure
interface GitHubTreeService {
  // Load repository tree (recursive or single level)
  getTree(owner: string, repo: string, options?: {
    ref?: string;        // branch/tag/sha
    recursive?: boolean; // true for full tree, false for directory
    path?: string;       // specific subdirectory
  }): Promise<TreeNode[]>;

  // Load file content
  getContent(owner: string, repo: string, path: string, options?: {
    ref?: string;
    encoding?: 'utf-8' | 'base64';
  }): Promise<FileContent>;

  // Search files
  searchCode(query: string, options?: {
    owner?: string;
    repo?: string;
    path?: string;
  }): Promise<SearchResult[]>;
}
```

#### 2.2.2 Implementation: Octokit Service

```typescript
import { Octokit } from '@octokit/rest';

class GitHubService {
  private octokit: Octokit;
  private cache: Map<string, { data: any; expiry: number }>;

  constructor(token?: string) {
    this.octokit = new Octokit({ auth: token });
    this.cache = new Map();
  }

  async getRepositoryTree(
    owner: string,
    repo: string,
    sha: string = 'HEAD',
    recursive: boolean = false
  ): Promise<TreeEntry[]> {
    const cacheKey = `tree:${owner}/${repo}:${sha}:${recursive}`;

    if (this.isCached(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    const { data } = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: sha,
      recursive: recursive ? 'true' : undefined
    });

    // Transform to internal format
    const tree = data.tree.map(entry => ({
      path: entry.path!,
      type: entry.type as 'blob' | 'tree',
      sha: entry.sha!,
      size: entry.size,
      mode: entry.mode
    }));

    this.setCache(cacheKey, tree, 5 * 60 * 1000); // 5 min cache
    return tree;
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string = 'HEAD'
  ): Promise<{ content: string; sha: string; size: number }> {
    const cacheKey = `content:${owner}/${repo}:${path}:${ref}`;

    if (this.isCached(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref
    });

    if ('content' in data && data.type === 'file') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      const result = { content, sha: data.sha, size: data.size };
      this.setCache(cacheKey, result, 10 * 60 * 1000); // 10 min cache
      return result;
    }

    throw new Error(`Path ${path} is not a file`);
  }

  // Lazy directory expansion - only load one level at a time
  async getDirectoryContents(
    owner: string,
    repo: string,
    path: string,
    ref: string = 'HEAD'
  ): Promise<DirectoryEntry[]> {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path: path || '',
      ref
    });

    if (!Array.isArray(data)) {
      throw new Error(`Path ${path} is not a directory`);
    }

    return data.map(entry => ({
      name: entry.name,
      path: entry.path,
      type: entry.type as 'file' | 'dir' | 'symlink' | 'submodule',
      sha: entry.sha,
      size: entry.size || 0
    }));
  }

  private isCached(key: string): boolean {
    const cached = this.cache.get(key);
    return cached !== undefined && cached.expiry > Date.now();
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, { data, expiry: Date.now() + ttl });
  }
}
```

#### 2.2.3 Rate Limit Handling

```typescript
class RateLimitHandler {
  private remaining: number = 5000;
  private resetTime: number = 0;

  async checkLimit(): Promise<void> {
    if (this.remaining < 10 && Date.now() < this.resetTime) {
      const waitTime = this.resetTime - Date.now();
      throw new RateLimitError(`Rate limit exceeded. Resets in ${waitTime}ms`);
    }
  }

  updateFromResponse(headers: Headers): void {
    this.remaining = parseInt(headers.get('x-ratelimit-remaining') || '5000');
    this.resetTime = parseInt(headers.get('x-ratelimit-reset') || '0') * 1000;
  }
}
```

### 2.3 File Tree State Structure

```typescript
interface FileTreeState {
  // Repository info
  repository: {
    owner: string;
    name: string;
    defaultBranch: string;
    currentRef: string;
  } | null;

  // Tree structure (normalized for performance)
  nodes: Map<string, TreeNode>;      // path -> node
  children: Map<string, string[]>;   // path -> child paths
  expanded: Set<string>;             // expanded directory paths

  // Loading states
  loading: {
    tree: boolean;
    directories: Set<string>;        // directories being loaded
    files: Set<string>;              // files being loaded
  };

  // File contents cache
  contents: Map<string, {
    content: string;
    sha: string;
    lastAccessed: number;
  }>;

  // Errors
  errors: Map<string, Error>;
}

interface TreeNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  sha: string;
  size?: number;
  loaded: boolean;                   // true if children are loaded (for dirs)
}
```

---

## 3. Command Execution Backends

### 3.1 Approach Comparison Matrix

| Approach | Latency | Interactivity | Security | Setup Complexity | Cost | State Persistence |
|----------|---------|---------------|----------|------------------|------|-------------------|
| **WebSocket + PTY (self-hosted)** | ~10-50ms | Full (vim, htop) | Container isolation | High | VPS costs | Session-based |
| **Cloudflare Containers** | ~50-200ms | Limited (exec API) | Cloudflare managed | Medium | Pay-per-use | Container lifetime |
| **WebContainers (StackBlitz)** | ~100-300ms | Full in browser | Browser sandbox | Low | Free/Commercial | Tab lifetime |
| **webassembly.sh** | ~50-100ms | Partial | WASM sandbox | Low | Free | Tab lifetime |
| **Zellij Server Mode** | ~20-100ms | Full (native) | Host OS | Medium | VPS costs | Zellij session |
| **Neovim Remote API** | ~20-100ms | Editor only | Host OS | Medium | VPS costs | Neovim session |
| **AWS Lambda + EFS** | ~100-500ms | None (stateless) | Lambda isolation | Medium | Pay-per-call | EFS persistence |

### 3.2 Recommended: Tiered Approach

**Tier 1 (Immediate)**: WebContainers for browser-only experience
**Tier 2 (Short-term)**: Cloudflare Containers for authenticated users
**Tier 3 (Long-term)**: WebSocket + PTY for power users

### 3.3 Implementation: WebContainers (Tier 1)

```typescript
import { WebContainer } from '@webcontainer/api';

class WebContainerTerminal {
  private container: WebContainer | null = null;
  private shell: WebContainerProcess | null = null;

  async initialize(): Promise<void> {
    this.container = await WebContainer.boot();
  }

  async mountFiles(files: FileSystemTree): Promise<void> {
    if (!this.container) throw new Error('Container not initialized');
    await this.container.mount(files);
  }

  async startShell(
    onOutput: (data: string) => void,
    onExit: (code: number) => void
  ): Promise<{
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    kill: () => void;
  }> {
    if (!this.container) throw new Error('Container not initialized');

    this.shell = await this.container.spawn('jsh', {
      terminal: { cols: 80, rows: 24 }
    });

    // Stream output
    this.shell.output.pipeTo(new WritableStream({
      write(data) { onOutput(data); }
    }));

    // Handle exit
    this.shell.exit.then(onExit);

    // Return control interface
    const writer = this.shell.input.getWriter();

    return {
      write: (data: string) => writer.write(data),
      resize: (cols: number, rows: number) => this.shell?.resize({ cols, rows }),
      kill: () => this.shell?.kill()
    };
  }

  async exec(
    command: string,
    args: string[] = []
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (!this.container) throw new Error('Container not initialized');

    const process = await this.container.spawn(command, args);

    let stdout = '';
    let stderr = '';

    process.output.pipeTo(new WritableStream({
      write(data) { stdout += data; }
    }));

    // Note: WebContainers combine stdout/stderr
    const exitCode = await process.exit;

    return { stdout, stderr, exitCode };
  }

  // Convert GitHub tree to WebContainer file format
  static gitHubTreeToMount(
    tree: TreeEntry[],
    contents: Map<string, string>
  ): FileSystemTree {
    const result: FileSystemTree = {};

    for (const entry of tree) {
      const parts = entry.path.split('/');
      let current = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;

        if (isLast) {
          if (entry.type === 'blob') {
            current[part] = {
              file: { contents: contents.get(entry.path) || '' }
            };
          } else {
            current[part] = { directory: {} };
          }
        } else {
          if (!current[part]) {
            current[part] = { directory: {} };
          }
          current = (current[part] as DirectoryNode).directory;
        }
      }
    }

    return result;
  }
}
```

### 3.4 Implementation: WebSocket + PTY (Tier 3)

#### 3.4.1 Backend Server (Node.js)

```typescript
// server/terminal-server.ts
import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import { v4 as uuidv4 } from 'uuid';

interface TerminalSession {
  id: string;
  pty: pty.IPty;
  socket: WebSocket;
  createdAt: Date;
  cwd: string;
}

class TerminalServer {
  private wss: WebSocketServer;
  private sessions: Map<string, TerminalSession> = new Map();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', this.handleConnection.bind(this));

    // Cleanup orphaned sessions every 5 minutes
    setInterval(() => this.cleanupSessions(), 5 * 60 * 1000);
  }

  private handleConnection(socket: WebSocket, request: any): void {
    const sessionId = uuidv4();
    const workDir = this.getWorkDir(request); // Extract from query/headers

    // Spawn PTY
    const term = pty.spawn('bash', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: workDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      }
    });

    const session: TerminalSession = {
      id: sessionId,
      pty: term,
      socket,
      createdAt: new Date(),
      cwd: workDir
    };

    this.sessions.set(sessionId, session);

    // Send session ID to client
    socket.send(JSON.stringify({ type: 'session', id: sessionId }));

    // PTY output -> WebSocket
    term.onData((data: string) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'output', data }));
      }
    });

    // PTY exit -> WebSocket
    term.onExit(({ exitCode }) => {
      socket.send(JSON.stringify({ type: 'exit', code: exitCode }));
      this.sessions.delete(sessionId);
    });

    // WebSocket input -> PTY
    socket.on('message', (message: Buffer) => {
      try {
        const msg = JSON.parse(message.toString());

        switch (msg.type) {
          case 'input':
            term.write(msg.data);
            break;
          case 'resize':
            term.resize(msg.cols, msg.rows);
            break;
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (e) {
        console.error('Invalid message:', e);
      }
    });

    // Handle disconnect
    socket.on('close', () => {
      term.kill();
      this.sessions.delete(sessionId);
    });
  }

  private getWorkDir(request: any): string {
    // Extract work directory from request
    // Could be from query params, headers, or session storage
    const url = new URL(request.url, 'http://localhost');
    return url.searchParams.get('cwd') || '/tmp/workspace';
  }

  private cleanupSessions(): void {
    const maxAge = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    for (const [id, session] of this.sessions) {
      if (now - session.createdAt.getTime() > maxAge) {
        session.pty.kill();
        session.socket.close();
        this.sessions.delete(id);
      }
    }
  }
}
```

#### 3.4.2 Frontend Client

```typescript
// client/terminal-client.ts
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

class WebSocketTerminal {
  private terminal: Terminal;
  private socket: WebSocket | null = null;
  private fitAddon: FitAddon;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(container: HTMLElement) {
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      theme: {
        background: '#1e293b', // slate-800
        foreground: '#e2e8f0', // slate-200
        cursor: '#22d3ee',     // cyan-400
        selectionBackground: '#334155' // slate-700
      }
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(new WebLinksAddon());

    this.terminal.open(container);
    this.fitAddon.fit();

    // Handle terminal input
    this.terminal.onData(data => this.sendInput(data));

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
  }

  async connect(url: string, cwd?: string): Promise<void> {
    const fullUrl = cwd ? `${url}?cwd=${encodeURIComponent(cwd)}` : url;

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(fullUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.terminal.write('\r\n\x1b[32mConnected to server\x1b[0m\r\n');
        this.handleResize();
        resolve();
      };

      this.socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'session':
            this.sessionId = msg.id;
            break;
          case 'output':
            this.terminal.write(msg.data);
            break;
          case 'exit':
            this.terminal.write(`\r\n\x1b[33mProcess exited with code ${msg.code}\x1b[0m\r\n`);
            break;
          case 'pong':
            // Connection is alive
            break;
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.socket.onclose = () => {
        this.terminal.write('\r\n\x1b[31mDisconnected from server\x1b[0m\r\n');
        this.attemptReconnect(fullUrl);
      };
    });
  }

  private sendInput(data: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'input', data }));
    }
  }

  private handleResize(): void {
    this.fitAddon.fit();

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'resize',
        cols: this.terminal.cols,
        rows: this.terminal.rows
      }));
    }
  }

  private async attemptReconnect(url: string): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.terminal.write('\r\n\x1b[31mMax reconnection attempts reached\x1b[0m\r\n');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.terminal.write(`\r\n\x1b[33mReconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...\x1b[0m\r\n`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect(url);
    } catch (e) {
      console.error('Reconnection failed:', e);
    }
  }

  // Start ping/pong for connection keep-alive
  startHeartbeat(interval = 30000): void {
    setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, interval);
  }

  dispose(): void {
    this.socket?.close();
    this.terminal.dispose();
  }
}
```

### 3.5 Implementation: Cloudflare Containers (Tier 2)

```typescript
// Cloudflare Container integration via Workers
class CloudflareContainerClient {
  private baseUrl: string;
  private authToken: string;

  constructor(workerUrl: string, authToken: string) {
    this.baseUrl = workerUrl;
    this.authToken = authToken;
  }

  async createContainer(config: {
    image?: string;
    memory?: number;
    timeout?: number;
  } = {}): Promise<{ containerId: string }> {
    const response = await fetch(`${this.baseUrl}/containers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: config.image || 'node:20-alpine',
        memory: config.memory || 256,
        timeout: config.timeout || 300000
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create container: ${response.statusText}`);
    }

    return response.json();
  }

  async exec(
    containerId: string,
    command: string,
    options: { cwd?: string; env?: Record<string, string> } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const response = await fetch(`${this.baseUrl}/containers/${containerId}/exec`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command, ...options })
    });

    if (!response.ok) {
      throw new Error(`Exec failed: ${response.statusText}`);
    }

    return response.json();
  }

  async writeFile(
    containerId: string,
    path: string,
    content: string
  ): Promise<void> {
    await fetch(`${this.baseUrl}/containers/${containerId}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path, content })
    });
  }

  async destroy(containerId: string): Promise<void> {
    await fetch(`${this.baseUrl}/containers/${containerId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });
  }
}
```

---

## 4. Frontend-Backend Communication

### 4.1 Communication Pattern Comparison

| Pattern | Use Case | Pros | Cons |
|---------|----------|------|------|
| **REST** | CRUD, file operations | Simple, cacheable, familiar | No real-time, overhead per request |
| **WebSocket** | Terminal I/O, real-time updates | Bidirectional, low latency | Connection management complexity |
| **GraphQL** | Complex queries, partial data | Flexible queries, single endpoint | Complexity, learning curve |
| **Server-Sent Events** | One-way updates | Simple, auto-reconnect | One-way only |
| **gRPC-Web** | High-performance RPC | Type-safe, efficient | Setup complexity, browser support |

### 4.2 Recommended: Hybrid REST + WebSocket

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    REST Client ────────┬────────── WebSocket Client          │
│    (file ops,          │          (terminal I/O,             │
│     repo loading,      │           real-time updates)        │
│     authentication)    │                                     │
│                        │                                     │
└────────────────────────┼────────────────────────────────────┘
                         │
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼────┐                    ┌─────▼─────┐
    │  REST   │                    │ WebSocket │
    │  API    │                    │  Server   │
    └────┬────┘                    └─────┬─────┘
         │                               │
    ┌────▼────────────────────────────────▼────┐
    │              Backend Services             │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
    │  │  GitHub  │ │   File   │ │ Terminal │  │
    │  │ Service  │ │  Cache   │ │  Manager │  │
    │  └──────────┘ └──────────┘ └──────────┘  │
    └──────────────────────────────────────────┘
```

### 4.3 API Design

#### 4.3.1 REST API Endpoints

```yaml
# Repository Operations
GET    /api/repos/{owner}/{repo}                    # Get repo metadata
GET    /api/repos/{owner}/{repo}/tree/{ref}         # Get directory tree
GET    /api/repos/{owner}/{repo}/contents/{path}    # Get file content
GET    /api/repos/{owner}/{repo}/branches           # List branches

# Session Operations
POST   /api/sessions                                # Create new session
GET    /api/sessions/{id}                           # Get session info
DELETE /api/sessions/{id}                           # End session

# Container Operations
POST   /api/containers                              # Create container
GET    /api/containers/{id}                         # Get container status
POST   /api/containers/{id}/exec                    # Execute command
POST   /api/containers/{id}/files                   # Write file
DELETE /api/containers/{id}                         # Destroy container

# Authentication
POST   /api/auth/github                             # GitHub OAuth
POST   /api/auth/refresh                            # Refresh token
DELETE /api/auth/logout                             # Logout
```

#### 4.3.2 WebSocket Protocol

```typescript
// Client -> Server Messages
interface ClientMessage {
  type: 'terminal:input' | 'terminal:resize' | 'subscribe' | 'unsubscribe' | 'ping';
  payload: any;
}

// Server -> Client Messages
interface ServerMessage {
  type: 'terminal:output' | 'terminal:exit' | 'file:changed' | 'container:status' | 'pong' | 'error';
  payload: any;
}

// Example message flows
const examples = {
  terminalInput: {
    type: 'terminal:input',
    payload: { sessionId: 'abc123', data: 'ls -la\n' }
  },

  terminalOutput: {
    type: 'terminal:output',
    payload: { sessionId: 'abc123', data: 'total 48\ndrwxr-xr-x...' }
  },

  resize: {
    type: 'terminal:resize',
    payload: { sessionId: 'abc123', cols: 120, rows: 40 }
  },

  fileChanged: {
    type: 'file:changed',
    payload: { path: '/src/index.ts', event: 'modify' }
  }
};
```

### 4.4 Unified Backend Abstraction

```typescript
// Abstraction layer to support multiple backends
interface BackendProvider {
  // Lifecycle
  initialize(): Promise<void>;
  dispose(): Promise<void>;

  // File operations
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDirectory(path: string): Promise<DirectoryEntry[]>;

  // Terminal operations
  createTerminal(options?: TerminalOptions): Promise<TerminalSession>;

  // Command execution
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
}

// Implementations
class WebContainerBackend implements BackendProvider { /* ... */ }
class CloudflareContainerBackend implements BackendProvider { /* ... */ }
class WebSocketPTYBackend implements BackendProvider { /* ... */ }
class SimulatedBackend implements BackendProvider { /* existing mock code */ }

// Factory for backend selection
class BackendFactory {
  static create(type: BackendType, config: BackendConfig): BackendProvider {
    switch (type) {
      case 'webcontainer':
        return new WebContainerBackend(config);
      case 'cloudflare':
        return new CloudflareContainerBackend(config);
      case 'websocket-pty':
        return new WebSocketPTYBackend(config);
      case 'simulated':
      default:
        return new SimulatedBackend(config);
    }
  }
}

// Usage in React
const useBackend = (type: BackendType = 'simulated') => {
  const [backend, setBackend] = useState<BackendProvider | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const provider = BackendFactory.create(type, config);

    provider.initialize()
      .then(() => {
        setBackend(provider);
        setStatus('connected');
      })
      .catch(err => {
        console.error('Backend init failed:', err);
        // Fallback to simulated
        const fallback = BackendFactory.create('simulated', config);
        fallback.initialize().then(() => {
          setBackend(fallback);
          setStatus('connected');
        });
      });

    return () => { provider.dispose(); };
  }, [type]);

  return { backend, status };
};
```

---

## 5. State Management Migration

### 5.1 Current State Structure (Simulated)

```typescript
// Current state scattered across multiple useState calls
const [tabs, setTabs] = useState<Tab[]>([...]);
const [activeTab, setActiveTab] = useState<string>('...');
const [fileTree, setFileTree] = useState<FileNode[]>([...]);
const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
const [currentCommand, setCurrentCommand] = useState<string>('');
// etc.
```

### 5.2 Recommended State Architecture

```typescript
// Unified state with clear separation of concerns
interface AppState {
  // Connection status
  connection: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    backend: BackendType;
    error?: Error;
  };

  // Repository state
  repository: {
    source: 'github' | 'local' | 'simulated';
    owner?: string;
    name?: string;
    ref?: string;
    loading: boolean;
    error?: Error;
  };

  // File tree state
  fileTree: {
    root: string;
    nodes: Record<string, FileNode>;      // Normalized by path
    children: Record<string, string[]>;   // parent path -> child paths
    expanded: Set<string>;
    selected: string | null;
    loading: Set<string>;                  // Paths being loaded
  };

  // Editor state
  editor: {
    tabs: Tab[];
    activeTabId: string | null;
    buffers: Record<string, Buffer>;       // tabId -> content
    dirty: Set<string>;                    // Modified buffers
  };

  // Terminal state
  terminal: {
    sessions: TerminalSession[];
    activeSessionId: string | null;
    history: Record<string, TerminalLine[]>;
  };

  // UI state
  ui: {
    layout: LayoutConfig;
    theme: Theme;
    sidebarWidth: number;
    terminalHeight: number;
  };
}

interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  loaded: boolean;          // For directories: have children been loaded?
  loading: boolean;
  error?: Error;
}

interface Tab {
  id: string;
  path: string;
  title: string;
  type: 'file' | 'terminal' | 'preview';
  icon?: string;
}

interface Buffer {
  content: string;
  originalContent: string;   // For diff/dirty detection
  language: string;
  version: number;           // For optimistic updates
}
```

### 5.3 State Management with Zustand

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

interface FileTreeStore {
  // State
  nodes: Record<string, FileNode>;
  children: Record<string, string[]>;
  expanded: Set<string>;
  selected: string | null;
  loading: Set<string>;

  // Actions
  setNodes: (nodes: FileNode[]) => void;
  toggleExpand: (path: string) => void;
  select: (path: string) => void;
  loadDirectory: (path: string) => Promise<void>;
  loadFile: (path: string) => Promise<string>;
}

const useFileTreeStore = create<FileTreeStore>()(
  immer((set, get) => ({
    nodes: {},
    children: {},
    expanded: new Set(),
    selected: null,
    loading: new Set(),

    setNodes: (nodes) => set(state => {
      for (const node of nodes) {
        state.nodes[node.path] = node;
      }
    }),

    toggleExpand: (path) => set(state => {
      if (state.expanded.has(path)) {
        state.expanded.delete(path);
      } else {
        state.expanded.add(path);
        // Trigger lazy load if not loaded
        const node = state.nodes[path];
        if (node?.type === 'directory' && !node.loaded) {
          get().loadDirectory(path);
        }
      }
    }),

    select: (path) => set(state => { state.selected = path; }),

    loadDirectory: async (path) => {
      const { loading, nodes } = get();
      if (loading.has(path)) return;

      set(state => { state.loading.add(path); });

      try {
        // Use injected backend service
        const entries = await backendService.listDirectory(path);

        set(state => {
          state.children[path] = entries.map(e => e.path);
          for (const entry of entries) {
            state.nodes[entry.path] = {
              path: entry.path,
              name: entry.name,
              type: entry.type,
              size: entry.size,
              loaded: false,
              loading: false
            };
          }
          state.nodes[path].loaded = true;
          state.loading.delete(path);
        });
      } catch (error) {
        set(state => {
          state.nodes[path].error = error as Error;
          state.loading.delete(path);
        });
      }
    },

    loadFile: async (path) => {
      set(state => { state.loading.add(path); });

      try {
        const content = await backendService.readFile(path);
        set(state => { state.loading.delete(path); });
        return content;
      } catch (error) {
        set(state => {
          state.loading.delete(path);
          state.nodes[path].error = error as Error;
        });
        throw error;
      }
    }
  }))
);
```

### 5.4 Migration Strategy: Parallel Mode

```typescript
// Run simulated and real backends in parallel during migration
class ParallelBackend implements BackendProvider {
  private simulated: SimulatedBackend;
  private real: BackendProvider;
  private mode: 'simulated' | 'real' | 'compare';

  constructor(realBackend: BackendProvider) {
    this.simulated = new SimulatedBackend();
    this.real = realBackend;
    this.mode = 'simulated';
  }

  async readFile(path: string): Promise<string> {
    switch (this.mode) {
      case 'simulated':
        return this.simulated.readFile(path);

      case 'real':
        return this.real.readFile(path);

      case 'compare':
        const [simResult, realResult] = await Promise.allSettled([
          this.simulated.readFile(path),
          this.real.readFile(path)
        ]);

        // Log differences for debugging
        if (simResult.status === 'fulfilled' && realResult.status === 'fulfilled') {
          if (simResult.value !== realResult.value) {
            console.warn(`Content mismatch for ${path}`);
          }
        }

        // Return real result, fallback to simulated
        if (realResult.status === 'fulfilled') {
          return realResult.value;
        }
        if (simResult.status === 'fulfilled') {
          console.warn(`Falling back to simulated for ${path}`);
          return simResult.value;
        }
        throw realResult.reason;
    }
  }

  setMode(mode: 'simulated' | 'real' | 'compare'): void {
    this.mode = mode;
  }
}
```

---

## 6. Performance Optimization

### 6.1 File Tree Optimization

#### 6.1.1 Lazy Loading with Pagination

```typescript
interface PaginatedDirectoryLoader {
  // Load directory contents with pagination
  loadDirectory(
    path: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<{
    entries: DirectoryEntry[];
    total: number;
    hasMore: boolean;
  }>;
}

// Virtual scrolling for large directories
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualFileTree: React.FC<{ entries: FileNode[] }> = ({ entries }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24, // Line height
    overscan: 10
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <FileTreeNode
            key={virtualItem.key}
            node={entries[virtualItem.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

#### 6.1.2 File Content Caching

```typescript
class FileCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private maxAge: number;

  constructor(maxSize = 50 * 1024 * 1024, maxAge = 10 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    // LRU: Update timestamp on access
    entry.timestamp = Date.now();
    return entry.content;
  }

  set(key: string, content: string): void {
    const size = new Blob([content]).size;

    // Evict old entries if needed
    while (this.getCurrentSize() + size > this.maxSize) {
      const oldest = this.findOldest();
      if (oldest) this.cache.delete(oldest);
      else break;
    }

    this.cache.set(key, { content, timestamp: Date.now(), size });
  }

  private getCurrentSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  private findOldest(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}
```

### 6.2 Terminal Performance

#### 6.2.1 Output Buffering

```typescript
class TerminalOutputBuffer {
  private buffer: string[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private onFlush: (data: string) => void;
  private maxBufferSize = 100;
  private flushInterval = 16; // ~60fps

  constructor(onFlush: (data: string) => void) {
    this.onFlush = onFlush;
  }

  write(data: string): void {
    this.buffer.push(data);

    // Immediate flush if buffer is large
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
      return;
    }

    // Debounced flush for small writes
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  private flush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.buffer.length > 0) {
      const data = this.buffer.join('');
      this.buffer = [];
      this.onFlush(data);
    }
  }
}
```

#### 6.2.2 History Management

```typescript
class TerminalHistoryManager {
  private history: TerminalLine[] = [];
  private maxLines = 10000;

  addLine(line: TerminalLine): void {
    this.history.push(line);

    // Trim old lines
    if (this.history.length > this.maxLines) {
      this.history = this.history.slice(-this.maxLines);
    }
  }

  getVisibleLines(startLine: number, count: number): TerminalLine[] {
    return this.history.slice(startLine, startLine + count);
  }

  search(query: string): number[] {
    const matches: number[] = [];
    for (let i = 0; i < this.history.length; i++) {
      if (this.history[i].content.includes(query)) {
        matches.push(i);
      }
    }
    return matches;
  }

  clear(): void {
    this.history = [];
  }
}
```

### 6.3 Large Repository Handling

```typescript
interface LargeRepoStrategy {
  // Configuration
  config: {
    maxTreeDepth: number;      // Don't load beyond this depth initially
    maxFilesToLoad: number;    // Limit concurrent file loads
    ignorePatterns: string[];  // Skip these patterns (node_modules, etc.)
  };

  // Selective loading
  shouldLoad(path: string, depth: number): boolean;
  prioritize(paths: string[]): string[];
}

const defaultLargeRepoConfig: LargeRepoStrategy['config'] = {
  maxTreeDepth: 3,
  maxFilesToLoad: 50,
  ignorePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '__pycache__',
    '.venv',
    'vendor',
    'target'
  ]
};

class SmartTreeLoader {
  private config: LargeRepoStrategy['config'];

  shouldLoad(path: string, depth: number): boolean {
    // Don't load ignored paths
    for (const pattern of this.config.ignorePatterns) {
      if (path.includes(pattern)) return false;
    }

    // Limit depth
    if (depth > this.config.maxTreeDepth) return false;

    return true;
  }

  // Prioritize important files
  prioritize(paths: string[]): string[] {
    const priority = [
      'README.md',
      'package.json',
      'Cargo.toml',
      'go.mod',
      'pyproject.toml',
      'src',
      'lib',
      'app'
    ];

    return paths.sort((a, b) => {
      const aName = a.split('/').pop() || '';
      const bName = b.split('/').pop() || '';
      const aIndex = priority.findIndex(p => aName.toLowerCase().includes(p.toLowerCase()));
      const bIndex = priority.findIndex(p => bName.toLowerCase().includes(p.toLowerCase()));

      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }
}
```

---

## 7. Implementation Phases

### Phase 1: GitHub Integration (Week 1-2)

**Goal**: Load real GitHub repositories into the file tree

**Tasks**:
1. [ ] Implement `GitHubService` with Octokit
2. [ ] Add repository URL input and validation
3. [ ] Replace hardcoded file tree with GitHub API data
4. [ ] Implement lazy directory loading on expand
5. [ ] Add file content fetching for editor
6. [ ] Implement caching layer with TTL
7. [ ] Handle rate limiting gracefully
8. [ ] Add loading states and error boundaries

**Deliverable**: File tree and editor show real GitHub repo content

### Phase 2: WebContainers Integration (Week 3-4)

**Goal**: Execute real commands in browser

**Tasks**:
1. [ ] Install and configure @webcontainer/api
2. [ ] Mount GitHub repo files to WebContainer
3. [ ] Replace simulated command execution with WebContainer shell
4. [ ] Implement xterm.js integration with proper styling
5. [ ] Add file system sync (editor saves -> WebContainer)
6. [ ] Handle WebContainer limitations (Node.js focus)
7. [ ] Add fallback to simulated mode if WebContainer fails

**Deliverable**: Terminal executes real commands (npm, node, etc.)

### Phase 3: State Management Refactor (Week 5)

**Goal**: Robust state management for real-time data

**Tasks**:
1. [ ] Migrate to Zustand for global state
2. [ ] Implement normalized file tree state
3. [ ] Add optimistic updates for file operations
4. [ ] Implement dirty buffer tracking for editor
5. [ ] Add connection status management
6. [ ] Persist UI preferences to localStorage

**Deliverable**: Clean state architecture ready for multiple backends

### Phase 4: Backend Abstraction Layer (Week 6)

**Goal**: Support multiple backend implementations

**Tasks**:
1. [ ] Define `BackendProvider` interface
2. [ ] Implement `WebContainerBackend`
3. [ ] Implement `SimulatedBackend` (existing code)
4. [ ] Create `BackendFactory` for runtime selection
5. [ ] Add backend switching in settings
6. [ ] Implement parallel/compare mode for testing

**Deliverable**: Swappable backends with same UI

### Phase 5: WebSocket + PTY Server (Week 7-8)

**Goal**: Full interactive terminal with server backend

**Tasks**:
1. [ ] Set up Node.js server with ws and node-pty
2. [ ] Implement secure WebSocket protocol
3. [ ] Add authentication/session management
4. [ ] Implement `WebSocketPTYBackend` on frontend
5. [ ] Add reconnection logic with exponential backoff
6. [ ] Implement terminal multiplexing (multiple sessions)
7. [ ] Add Docker containerization for security

**Deliverable**: Full vim/htop support with persistent sessions

### Phase 6: Polish & Performance (Week 9-10)

**Goal**: Production-ready performance

**Tasks**:
1. [ ] Implement virtual scrolling for large directories
2. [ ] Add output buffering for terminal
3. [ ] Optimize re-renders with React.memo
4. [ ] Add service worker for offline capability
5. [ ] Implement large repo handling strategies
6. [ ] Performance profiling and optimization
7. [ ] Error monitoring integration (Sentry)

**Deliverable**: Smooth experience with 1000+ file repos

---

## Appendices

### A. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI Framework | React 18 | Component architecture |
| State Management | Zustand | Global state |
| Terminal Emulator | xterm.js | Terminal rendering |
| Syntax Highlighting | Shiki or Prism | Code coloring |
| GitHub Client | Octokit | GitHub API |
| Browser Runtime | WebContainers | In-browser execution |
| Server Terminal | node-pty + ws | Server-side PTY |
| Styling | Tailwind CSS | Utility-first CSS |
| Build Tool | Vite | Fast development |

### B. Security Considerations

1. **GitHub Token Handling**
   - Never expose tokens in frontend code
   - Use short-lived tokens via OAuth
   - Proxy API calls through backend for private repos

2. **Command Execution**
   - WebContainers are sandboxed by design
   - Server PTY should run in containers (Docker)
   - Implement command allowlists/blocklists
   - Audit logging for sensitive operations

3. **Data Isolation**
   - Each user session gets isolated container
   - No persistent storage by default
   - Clear containers on session end

### C. Cost Estimates

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|-------|
| GitHub API | 5000 req/hr | Included with Enterprise | Sufficient for most use |
| WebContainers | Free | Commercial license | Self-hosted alternative |
| Cloudflare Workers | 100k req/day | $5/10M req | Container costs extra |
| Self-hosted PTY | VPS costs | ~$20-50/month | Most control |

### D. References

1. [WebContainers API Documentation](https://webcontainers.io/api)
2. [Octokit Documentation](https://octokit.github.io/rest.js)
3. [xterm.js Documentation](https://xtermjs.org/docs/)
4. [node-pty GitHub](https://github.com/microsoft/node-pty)
5. [Zustand Documentation](https://docs.pmnd.rs/zustand)
6. [Yazelix Reference Project](https://github.com/luccahuguet/yazelix)

---

## Decision Record

| Date | Decision | Rationale |
|------|----------|-----------|
| TBD | Use WebContainers for Tier 1 | Browser-only, no server needed, good Node.js support |
| TBD | GitHub REST over GraphQL | Simpler for basic operations, easier debugging |
| TBD | Zustand over Redux | Less boilerplate, better TypeScript support |
| TBD | Hybrid REST+WebSocket | REST for stateless ops, WebSocket for real-time |

---

*Document Version: 1.0*
*Last Updated: 2025-01-25*
*Author: Generated by Claude for Yazelix Live development planning*
