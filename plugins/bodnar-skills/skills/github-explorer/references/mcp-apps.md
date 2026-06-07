# MCP Apps

One way to deliver the Stars Explorer UI is as an MCP App: an interactive interface served by an MCP server and rendered inline inside an AI chat host, so the workbench (or a focused piece of it, like a single repository's browser or a search-results datagrid) appears directly in a conversation in Claude, ChatGPT, VS Code, and other compliant hosts. This reference covers the protocol and the SDK and how the project's existing design system and view code map onto them. Whether to ship an MCP App at all is the owner's call; this is the how, for when the answer is yes.

## Two things, clearly distinguished

There is a protocol and there is an SDK, and they are easy to conflate.

The protocol is MCP Apps, developed in the `modelcontextprotocol/ext-apps` repository (github.com/modelcontextprotocol/ext-apps). It is an official extension to the core Model Context Protocol that standardizes how a tool declares an interactive UI and how a host renders it. The stable specification version is 2026-01-26. The repository also publishes the `@modelcontextprotocol/ext-apps` SDK, with sub-packages for building views, for embedding views in a host, and for registering tools with UI metadata on a server.

The SDK is mcp-ui, developed in the `MCP-UI-Org/mcp-ui` repository (github.com/MCP-UI-Org/mcp-ui). It pioneered interactive UI over MCP, and those patterns directly influenced the MCP Apps specification. The `@mcp-ui/*` packages implement the MCP Apps standard: `@mcp-ui/server` creates UI resources, and `@mcp-ui/client` is the recommended client SDK for MCP Apps hosts. mcp-ui also offers server SDKs in Ruby and Python, and adapters that let an mcp-ui view run in hosts that use a different underlying API (for example a ChatGPT Apps-SDK adapter), which is useful when targeting several hosts from one view.

In short: ext-apps is the standard; mcp-ui is a production-ready implementation of it. A project can build directly on the ext-apps SDK or use mcp-ui on top of it. For this project, mcp-ui's `createUIResource` plus the ext-apps server registration is the most direct path, and `@mcp-ui/client` is the recommendation if the project ever needs to host views itself.

## How it works

The mechanism is four steps. A tool on the MCP server declares a UI resource under the `ui://` scheme. The model calls the tool. The host fetches the declared resource and renders its HTML in a sandboxed iframe. From there communication is bidirectional: the host passes the tool's data into the view, and the view can call other tools back through the host. The link from a tool to its UI is carried in the tool's metadata as `_meta.ui.resourceUri`; hosts detect that field, fetch the UI via a resource read, and render it alongside the tool result.

The wire format for a UI resource is an object with a `ui://` URI, the MIME type `text/html;profile=mcp-app`, and the HTML carried either as text or as base64. That HTML is the same kind of self-contained document the project already produces; the reference `assets/examples/app.html` is exactly the shape that fits here.

## How the project maps onto it

The fit is good because the project's UI is already self-contained HTML driven by a tokenized design system.

The design system travels unchanged. `assets/design-system/` is framework-agnostic CSS plus one TypeScript config, so the view inside the iframe references the same tokens and primitives as the standalone app, and an MCP App rendering of the workbench looks identical to the static one. The host can also expose its own theming; if matching the host's light or dark state matters, read the host styles the SDK surfaces and let the existing `data-theme` switch follow them.

The natural unit to expose is a tool per meaningful view. A `search_stars` tool can return the datagrid of results as its UI. A `show_repository` tool can return the file-browser and README pane for one repository. A `discover` tool can return the Discover grid. Each tool declares its own `ui://` resource and links it through `_meta.ui.resourceUri`. This decomposition matches how the app already separates its panes, so the views are mostly lifts of existing markup with their data supplied by the tool result rather than fetched client-side.

The search and pipeline layer is unaffected. The MCP server is another consumer of the same index and dataset described in `references/architecture.md`; it does not change the contracts. A tool handler runs a query against the index and returns both the structured result (for the model to read) and the UI resource (for the host to render).

Interaction flows back through the host. When a user acts inside the view (selects a repository, stars one, changes a filter), the view sends a message that the host routes to a tool call, the same pattern the standalone app uses for its own state, redirected through the host bridge. Keep the view's own ephemeral state local and reserve tool calls for actions that need the server or the model.

## Building one

The fastest path is the upstream Agent Skills. The ext-apps repository ships four skills designed for exactly this: `create-mcp-app` scaffolds a new MCP App from scratch, `add-app-to-server` adds an interactive UI to an existing MCP server's tools, `convert-web-app` turns an existing web app into a hybrid web and MCP App, and `migrate-oai-app` converts an OpenAI Apps SDK app to MCP Apps. For this project, `add-app-to-server` (if there is already a stars MCP server) and `convert-web-app` (to lift the existing workbench HTML) are the most relevant.

Install them in Claude Code from the plugin marketplace:

```
/plugin marketplace add modelcontextprotocol/ext-apps
/plugin install mcp-apps@modelcontextprotocol-ext-apps
```

Any agent that supports Agent Skills can use them; the repository's `docs/agent-skills.md` has manual installation instructions. When these skills are available, prefer letting them drive the scaffolding and wiring, and use this reference to ensure what they produce uses the project's design system and view decomposition.

The server-side shape, using mcp-ui's resource creation with ext-apps registration, is: create the UI resource with `createUIResource` (a `ui://` URI and the view's HTML), register a resource handler that serves it, and register the tool with `_meta.ui.resourceUri` pointing at that resource so the host knows to render it. The starter templates in the ext-apps repository cover this in React, Vue, Svelte, Preact, Solid, and vanilla JavaScript, so the owner's framework choice (see `references/stack-options.md`) is accommodated; the vanilla and Vue templates align most directly with the project's preferences.

## Resources

The protocol, its spec, the quickstart, and the API docs live at github.com/modelcontextprotocol/ext-apps and apps.extensions.modelcontextprotocol.io. The mcp-ui SDK, its walkthroughs, and its host compatibility tables live at github.com/MCP-UI-Org/mcp-ui and mcpui.dev. Host support varies and is evolving, so check the current clients list before committing to a target host. Because both projects are moving quickly, verify versions and package names against the live repositories rather than relying on a snapshot when implementing.

## Security note

The view runs in a sandboxed iframe, which is the protocol's containment boundary. Treat anything the view receives from the host, and anything a tool receives from the view, as untrusted input and validate it. Do not put secrets in the view's HTML; it is delivered to the host and rendered client-side. The search key the view's host uses should be the search-only key described in `references/architecture.md`, never an admin key.
