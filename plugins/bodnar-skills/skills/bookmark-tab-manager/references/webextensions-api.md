# WebExtensions API Reference
## Cross-Browser Bookmark Management

**Last Updated**: October 27, 2025  
**API Version**: Manifest V3  
**Compatibility**: Chrome, Firefox, Edge, Brave

---

## Table of Contents

1. [Overview](#overview)
2. [Bookmarks API](#bookmarks-api)
3. [Tabs API](#tabs-api)
4. [Tab Groups API](#tab-groups-api)
5. [TypeScript Types](#typescript-types)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)

---

## Overview

The WebExtensions API provides cross-browser APIs for manipulating bookmarks, tabs, and browser functionality. The `browser.bookmarks` namespace (Chrome uses `chrome.bookmarks`) provides methods to create, organize, and manipulate bookmarks.

### Permissions Required

```json
{
  "manifest_version": 3,
  "permissions": [
    "bookmarks",
    "tabs",
    "tabGroups"
  ]
}
```

### Browser Compatibility

| API | Chrome | Firefox | Edge | Safari |
|-----|--------|---------|------|--------|
| bookmarks | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ |
| tabs | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ |
| tabGroups | Ã¢Å“â€¦ | âŒ | Ã¢Å“â€¦ | âŒ |

---

## Bookmarks API

### Core Types

#### BookmarkTreeNode

```typescript
interface BookmarkTreeNode {
  id: string;                    // Unique ID
  parentId?: string;             // Parent folder ID
  index?: number;                // Position within parent
  url?: string;                  // URL (undefined for folders)
  title: string;                 // Bookmark title or folder name
  dateAdded?: number;            // Creation timestamp (ms since epoch)
  dateModified?: number;         // Modification timestamp
  dateGroupModified?: number;    // Folder content modification time
  unmodifiable?: string;         // "managed" if policy-controlled
  children?: BookmarkTreeNode[]; // Child nodes (folders only)
}
```

#### BookmarkTreeNodeType

```typescript
type BookmarkTreeNodeType = 
  | "bookmark"  // URL bookmark
  | "folder"    // Folder/directory
  | "separator"; // Visual separator
```

#### CreateDetails

```typescript
interface CreateDetails {
  parentId?: string;           // Parent folder (default: "Other Bookmarks")
  index?: number;              // Position (default: end of list)
  title?: string;              // Title (default: "")
  url?: string;                // URL (omit for folders)
  type?: BookmarkTreeNodeType; // Type (default: "bookmark" or "folder")
}
```

### Core Methods

#### getTree()

Retrieve entire bookmark tree hierarchy.

```typescript
browser.bookmarks.getTree(): Promise<BookmarkTreeNode[]>
```

**Returns**: Array with single root node containing all bookmarks.

**Example**:
```typescript
const tree = await browser.bookmarks.getTree();
const root = tree[0];

function traverse(node: BookmarkTreeNode, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.url ? 'Ã¢Å“"' : 'Ã°Å¸"'}`, node.title);
  
  if (node.children) {
    node.children.forEach(child => traverse(child, depth + 1));
  }
}

traverse(root);
```

#### get()

Retrieve specific bookmarks by ID.

```typescript
browser.bookmarks.get(
  idOrIdList: string | string[]
): Promise<BookmarkTreeNode[]>
```

**Example**:
```typescript
const bookmarks = await browser.bookmarks.get(['1', '2', '3']);
```

#### getChildren()

Get immediate children of a folder.

```typescript
browser.bookmarks.getChildren(
  id: string
): Promise<BookmarkTreeNode[]>
```

**Example**:
```typescript
const children = await browser.bookmarks.getChildren('1');
```

#### getRecent()

Get most recently added bookmarks.

```typescript
browser.bookmarks.getRecent(
  numberOfItems: number
): Promise<BookmarkTreeNode[]>
```

**Example**:
```typescript
const recent = await browser.bookmarks.getRecent(10);
```

#### search()

Search bookmarks by query or object.

```typescript
browser.bookmarks.search(
  query: string | {
    query?: string;
    url?: string;
    title?: string;
  }
): Promise<BookmarkTreeNode[]>
```

**Examples**:
```typescript
// Text search
const results = await browser.bookmarks.search('typescript');

// URL search
const byUrl = await browser.bookmarks.search({
  url: 'https://github.com/microsoft/TypeScript'
});

// Title search
const byTitle = await browser.bookmarks.search({
  title: 'TypeScript Handbook'
});
```

#### create()

Create a new bookmark or folder.

```typescript
browser.bookmarks.create(
  bookmark: CreateDetails
): Promise<BookmarkTreeNode>
```

**Examples**:
```typescript
// Create bookmark
const bookmark = await browser.bookmarks.create({
  title: 'TypeScript Documentation',
  url: 'https://www.typescriptlang.org/docs/',
  parentId: '1'
});

// Create folder
const folder = await browser.bookmarks.create({
  title: 'Development Resources',
  parentId: '1'
});

// Create separator
const separator = await browser.bookmarks.create({
  type: 'separator',
  parentId: '1'
});
```

#### move()

Move bookmark to new position.

```typescript
browser.bookmarks.move(
  id: string,
  destination: {
    parentId?: string;
    index?: number;
  }
): Promise<BookmarkTreeNode>
```

**Example**:
```typescript
// Move to different folder
await browser.bookmarks.move('123', {
  parentId: '456'
});

// Move to specific position
await browser.bookmarks.move('123', {
  parentId: '456',
  index: 0 // First position
});
```

#### update()

Update bookmark title or URL.

```typescript
browser.bookmarks.update(
  id: string,
  changes: {
    title?: string;
    url?: string;
  }
): Promise<BookmarkTreeNode>
```

**Example**:
```typescript
await browser.bookmarks.update('123', {
  title: 'Updated Title',
  url: 'https://new-url.com'
});
```

#### remove()

Delete a bookmark.

```typescript
browser.bookmarks.remove(id: string): Promise<void>
```

**Note**: Cannot remove non-empty folders. Use `removeTree()` instead.

**Example**:
```typescript
await browser.bookmarks.remove('123');
```

#### removeTree()

Recursively delete bookmark or folder with all children.

```typescript
browser.bookmarks.removeTree(id: string): Promise<void>
```

**Example**:
```typescript
await browser.bookmarks.removeTree('folder-id');
```

### Events

#### onCreated

Fired when bookmark or folder is created.

```typescript
browser.bookmarks.onCreated.addListener(
  (id: string, bookmark: BookmarkTreeNode) => void
)
```

**Example**:
```typescript
browser.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log(`Created: ${bookmark.title}`);
});
```

#### onRemoved

Fired when bookmark or folder is removed.

```typescript
browser.bookmarks.onRemoved.addListener(
  (id: string, removeInfo: {
    parentId: string;
    index: number;
    node: BookmarkTreeNode;
  }) => void
)
```

#### onChanged

Fired when bookmark or folder properties change.

```typescript
browser.bookmarks.onChanged.addListener(
  (id: string, changeInfo: {
    title?: string;
    url?: string;
  }) => void
)
```

#### onMoved

Fired when bookmark or folder is moved.

```typescript
browser.bookmarks.onMoved.addListener(
  (id: string, moveInfo: {
    parentId: string;
    index: number;
    oldParentId: string;
    oldIndex: number;
  }) => void
)
```

#### onChildrenReordered

Fired when folder's children are reordered in UI.

```typescript
browser.bookmarks.onChildrenReordered.addListener(
  (id: string, reorderInfo: {
    childIds: string[];
  }) => void
)
```

---

## Tabs API

### Tab Object

```typescript
interface Tab {
  id?: number;              // Tab ID (-1 for closing tabs)
  index: number;            // Position in window
  windowId: number;         // Window ID
  openerTabId?: number;     // Tab that opened this one
  highlighted: boolean;     // Is highlighted
  active: boolean;          // Is active in window
  pinned: boolean;          // Is pinned
  audible?: boolean;        // Is playing audio
  discarded: boolean;       // Is discarded (memory optimization)
  autoDiscardable: boolean; // Can be discarded
  mutedInfo?: MutedInfo;    // Mute state
  url?: string;             // URL
  pendingUrl?: string;      // URL being navigated to
  title?: string;           // Page title
  favIconUrl?: string;      // Favicon URL
  status?: string;          // "loading" | "complete"
  incognito: boolean;       // Is incognito
  width?: number;           // Tab width
  height?: number;          // Tab height
  sessionId?: string;       // Session restore ID
  groupId: number;          // Tab group ID (-1 if not grouped)
}
```

### Core Methods

#### query()

Find tabs matching criteria.

```typescript
browser.tabs.query(
  queryInfo: {
    active?: boolean;
    pinned?: boolean;
    audible?: boolean;
    muted?: boolean;
    highlighted?: boolean;
    discarded?: boolean;
    autoDiscardable?: boolean;
    currentWindow?: boolean;
    lastFocusedWindow?: boolean;
    status?: 'loading' | 'complete';
    title?: string;
    url?: string | string[];
    windowId?: number;
    windowType?: 'normal' | 'popup' | 'panel' | 'app' | 'devtools';
    index?: number;
    groupId?: number;
  }
): Promise<Tab[]>
```

**Examples**:
```typescript
// Get all tabs
const allTabs = await browser.tabs.query({});

// Get active tab in current window
const [activeTab] = await browser.tabs.query({
  active: true,
  currentWindow: true
});

// Get tabs by URL pattern
const githubTabs = await browser.tabs.query({
  url: '*://github.com/*'
});

// Get audible tabs
const playingAudio = await browser.tabs.query({
  audible: true
});
```

#### create()

Create new tab.

```typescript
browser.tabs.create(
  createProperties: {
    windowId?: number;
    index?: number;
    url?: string;
    active?: boolean;
    pinned?: boolean;
    openerTabId?: number;
  }
): Promise<Tab>
```

**Example**:
```typescript
const tab = await browser.tabs.create({
  url: 'https://github.com',
  active: false,
  pinned: true
});
```

#### update()

Update tab properties.

```typescript
browser.tabs.update(
  tabId: number,
  updateProperties: {
    url?: string;
    active?: boolean;
    highlighted?: boolean;
    pinned?: boolean;
    muted?: boolean;
    openerTabId?: number;
    autoDiscardable?: boolean;
  }
): Promise<Tab>
```

#### remove()

Close tabs.

```typescript
browser.tabs.remove(
  tabIds: number | number[]
): Promise<void>
```

**Example**:
```typescript
// Close single tab
await browser.tabs.remove(123);

// Close multiple tabs
await browser.tabs.remove([123, 456, 789]);
```

#### group()

Add tabs to a group.

```typescript
browser.tabs.group(
  options: {
    tabIds: number | number[];
    groupId?: number;
    createProperties?: {
      windowId?: number;
    };
  }
): Promise<number> // Returns group ID
```

**Example**:
```typescript
const groupId = await browser.tabs.group({
  tabIds: [1, 2, 3]
});
```

---

## Tab Groups API

**Note**: Currently Chrome/Edge only, not supported in Firefox.

### TabGroup Object

```typescript
interface TabGroup {
  id: number;               // Group ID
  collapsed: boolean;       // Is collapsed
  color: string;            // Group color
  title?: string;           // Group title
  windowId: number;         // Window ID
}
```

### Methods

#### query()

```typescript
browser.tabGroups.query(
  queryInfo: {
    collapsed?: boolean;
    color?: string;
    title?: string;
    windowId?: number;
  }
): Promise<TabGroup[]>
```

#### update()

```typescript
browser.tabGroups.update(
  groupId: number,
  updateProperties: {
    collapsed?: boolean;
    color?: string;
    title?: string;
  }
): Promise<TabGroup>
```

#### move()

```typescript
browser.tabGroups.move(
  groupId: number,
  moveProperties: {
    index: number;
    windowId?: number;
  }
): Promise<TabGroup>
```

---

## TypeScript Types

Complete type definitions for use with Bun/TypeScript:

```typescript
// Save as: src/types/webextensions.d.ts

declare namespace Browser {
  namespace Bookmarks {
    type BookmarkTreeNodeType = 'bookmark' | 'folder' | 'separator';
    
    interface BookmarkTreeNode {
      id: string;
      parentId?: string;
      index?: number;
      url?: string;
      title: string;
      dateAdded?: number;
      dateModified?: number;
      dateGroupModified?: number;
      unmodifiable?: 'managed';
      children?: BookmarkTreeNode[];
    }
    
    interface CreateDetails {
      parentId?: string;
      index?: number;
      title?: string;
      url?: string;
      type?: BookmarkTreeNodeType;
    }
    
    interface SearchQuery {
      query?: string;
      url?: string;
      title?: string;
    }
    
    interface UpdateChanges {
      title?: string;
      url?: string;
    }
    
    interface MoveDestination {
      parentId?: string;
      index?: number;
    }
    
    interface RemoveInfo {
      parentId: string;
      index: number;
      node: BookmarkTreeNode;
    }
    
    interface ChangeInfo {
      title?: string;
      url?: string;
    }
    
    interface MoveInfo {
      parentId: string;
      index: number;
      oldParentId: string;
      oldIndex: number;
    }
    
    interface ReorderInfo {
      childIds: string[];
    }
    
    function getTree(): Promise<BookmarkTreeNode[]>;
    function get(idOrIdList: string | string[]): Promise<BookmarkTreeNode[]>;
    function getChildren(id: string): Promise<BookmarkTreeNode[]>;
    function getRecent(numberOfItems: number): Promise<BookmarkTreeNode[]>;
    function search(query: string | SearchQuery): Promise<BookmarkTreeNode[]>;
    function create(bookmark: CreateDetails): Promise<BookmarkTreeNode>;
    function move(id: string, destination: MoveDestination): Promise<BookmarkTreeNode>;
    function update(id: string, changes: UpdateChanges): Promise<BookmarkTreeNode>;
    function remove(id: string): Promise<void>;
    function removeTree(id: string): Promise<void>;
    
    const onCreated: {
      addListener(callback: (id: string, bookmark: BookmarkTreeNode) => void): void;
    };
    
    const onRemoved: {
      addListener(callback: (id: string, removeInfo: RemoveInfo) => void): void;
    };
    
    const onChanged: {
      addListener(callback: (id: string, changeInfo: ChangeInfo) => void): void;
    };
    
    const onMoved: {
      addListener(callback: (id: string, moveInfo: MoveInfo) => void): void;
    };
    
    const onChildrenReordered: {
      addListener(callback: (id: string, reorderInfo: ReorderInfo) => void): void;
    };
  }
  
  namespace Tabs {
    interface Tab {
      id?: number;
      index: number;
      windowId: number;
      openerTabId?: number;
      highlighted: boolean;
      active: boolean;
      pinned: boolean;
      audible?: boolean;
      discarded: boolean;
      autoDiscardable: boolean;
      url?: string;
      pendingUrl?: string;
      title?: string;
      favIconUrl?: string;
      status?: 'loading' | 'complete';
      incognito: boolean;
      groupId: number;
    }
    
    interface QueryInfo {
      active?: boolean;
      pinned?: boolean;
      audible?: boolean;
      currentWindow?: boolean;
      url?: string | string[];
      groupId?: number;
    }
    
    function query(queryInfo: QueryInfo): Promise<Tab[]>;
    function create(createProperties: Partial<Tab>): Promise<Tab>;
    function update(tabId: number, updateProperties: Partial<Tab>): Promise<Tab>;
    function remove(tabIds: number | number[]): Promise<void>;
    function group(options: { tabIds: number | number[]; groupId?: number }): Promise<number>;
  }
  
  namespace TabGroups {
    interface TabGroup {
      id: number;
      collapsed: boolean;
      color: string;
      title?: string;
      windowId: number;
    }
    
    function query(queryInfo: Partial<TabGroup>): Promise<TabGroup[]>;
    function update(groupId: number, updateProperties: Partial<TabGroup>): Promise<TabGroup>;
  }
}

// Chrome compatibility
declare const chrome: typeof Browser;
declare const browser: typeof Browser;
```

---

## Usage Examples

### Example 1: Flatten Bookmark Tree

```typescript
function flattenBookmarks(tree: Browser.Bookmarks.BookmarkTreeNode[]): Browser.Bookmarks.BookmarkTreeNode[] {
  const flattened: Browser.Bookmarks.BookmarkTreeNode[] = [];
  
  function traverse(nodes: Browser.Bookmarks.BookmarkTreeNode[]) {
    for (const node of nodes) {
      flattened.push(node);
      if (node.children) {
        traverse(node.children);
      }
    }
  }
  
  traverse(tree);
  return flattened;
}

// Usage
const tree = await browser.bookmarks.getTree();
const allBookmarks = flattenBookmarks(tree);
console.log(`Total bookmarks: ${allBookmarks.length}`);
```

### Example 2: Find Duplicates

```typescript
async function findDuplicateBookmarks() {
  const tree = await browser.bookmarks.getTree();
  const bookmarks = flattenBookmarks(tree)
    .filter(node => node.url); // Only bookmarks, not folders
  
  const urlMap = new Map<string, string[]>();
  
  for (const bookmark of bookmarks) {
    const ids = urlMap.get(bookmark.url!) || [];
    ids.push(bookmark.id);
    urlMap.set(bookmark.url!, ids);
  }
  
  return Array.from(urlMap.entries())
    .filter(([_, ids]) => ids.length > 1)
    .map(([url, ids]) => ({ url, ids }));
}

// Usage
const duplicates = await findDuplicateBookmarks();
console.log(`Found ${duplicates.length} duplicate URLs`);
```

### Example 3: Organize by Domain

```typescript
async function organizeByDomain() {
  const tree = await browser.bookmarks.getTree();
  const bookmarks = flattenBookmarks(tree).filter(node => node.url);
  
  const domainMap = new Map<string, Browser.Bookmarks.BookmarkTreeNode[]>();
  
  for (const bookmark of bookmarks) {
    const domain = new URL(bookmark.url!).hostname;
    const list = domainMap.get(domain) || [];
    list.push(bookmark);
    domainMap.set(domain, list);
  }
  
  // Create folders for each domain
  for (const [domain, bookmarks] of domainMap) {
    if (bookmarks.length > 5) { // Only create folder if >5 bookmarks
      const folder = await browser.bookmarks.create({
        title: domain,
        parentId: '1' // Bookmarks Bar
      });
      
      for (const bookmark of bookmarks) {
        await browser.bookmarks.move(bookmark.id, {
          parentId: folder.id
        });
      }
    }
  }
}
```

---

## Best Practices

### 1. Batch Operations

Always batch operations to minimize API calls:

```typescript
// âŒ Bad: Individual operations
for (const id of bookmarkIds) {
  await browser.bookmarks.remove(id);
}

// Ã¢Å“â€¦ Good: Batch with delay
const BATCH_SIZE = 100;
const DELAY_MS = 100;

for (let i = 0; i < bookmarkIds.length; i += BATCH_SIZE) {
  const batch = bookmarkIds.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(id => browser.bookmarks.remove(id)));
  if (i + BATCH_SIZE < bookmarkIds.length) {
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
}
```

### 2. Error Handling

Always handle errors gracefully:

```typescript
try {
  const bookmark = await browser.bookmarks.create({
    title: 'Example',
    url: 'https://example.com'
  });
} catch (error) {
  if (error.message.includes('Cannot modify root')) {
    console.error('Attempted to modify root folder');
  } else {
    throw error;
  }
}
```

### 3. Event Listeners

Clean up event listeners when done:

```typescript
const listener = (id: string, bookmark: Browser.Bookmarks.BookmarkTreeNode) => {
  console.log(`Created: ${bookmark.title}`);
};

browser.bookmarks.onCreated.addListener(listener);

// Later...
browser.bookmarks.onCreated.removeListener(listener);
```

### 4. Permissions

Always declare minimum required permissions:

```json
{
  "permissions": [
    "bookmarks"  // Only request bookmarks if that's all you need
  ]
}
```

---

## References

- **MDN Web Docs**: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/bookmarks
- **Chrome Documentation**: https://developer.chrome.com/docs/extensions/reference/api/bookmarks
- **Manifest V3**: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3

---

**Document Status**: Ready for Implementation  
**Last Review**: October 27, 2025
