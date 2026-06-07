# Application Interface Patterns

The application is a workbench: a dense, keyboard-friendly, multi-pane surface for working through a large set of repositories. The working reference is `assets/examples/app.html`, a complete self-contained build. Read it when you need to see how a behavior is actually wired. This document explains the patterns and the reasoning so they can be extended consistently.

## The shell

A fixed top bar sits above a CSS-grid body. The top bar holds the brand, the search field, the three search-mode segments (keyword, semantic, natural language), and the theme and settings controls. The search modes correspond to the retrieval modes the search layer provides (see the search contract in `references/architecture.md`); they are hidden in the Discover view because discovery is a different search problem.

The body is a grid whose columns are driven by layout tokens. In the default state it is sidebar, a resize handle, and the main pane. When a repository is selected the grid changes to sidebar, handle, a narrow master list, handle, and the browser pane, using `grid-template-columns: var(--sidebar-w) 0.375rem var(--list-w) 0.375rem 1fr`. The browser pane takes the remaining space; it carries `min-width: 0` so it can shrink all the way down when the list pane is dragged wide.

The detail handle and the browser pane both live in the markup at all times, but they only participate in the grid when a repository is selected. Both are `display: none` by default and switch to `display: block` under the selected state (the class on the body grid). This gating is load-bearing: the default grid defines three columns, so if the detail handle stayed in flow it would be a fourth in-flow child and wrap to a phantom second row beneath the layout. Any element that belongs only to the selected state must be taken out of flow when the selection is closed, not merely visually hidden. The mobile sidebar backdrop follows the same discipline by being fixed-positioned or `display: none` rather than an in-flow grid child.

Two more rules keep the grid robust given that the panels resize without bounds and their widths persist across sessions. First, the resizable tracks are capped to a fraction of the viewport in the template itself, written as `min(var(--sidebar-w), 75vw)` (and `40vw` for each of the two panes in the selected state), so a width dragged wide on a large monitor, or restored from storage, can never consume the whole row and starve the content column to zero on a smaller screen. The stored width is left untouched; the cap is applied only at render time, so the full width returns on a viewport wide enough to hold it. Second, the content column is `minmax(0, 1fr)` rather than `1fr`, because a bare `1fr` track has an implicit `min-width: auto` that lets its content set a floor; `minmax(0, 1fr)` lets the column shrink freely while still taking the remaining space. Together these mean a pane can be resized to nearly any size without a fixed maximum, yet the main pane always retains room to render.

## Sidebar

The left sidebar holds two things, in order. At the top is the view navigation: Stars and Discover, as prominent buttons with item counts, the active one carrying the accent background. Below that is a collapsible tree.

In the Stars view the tree has two top-level groups, Collections and Filters. Collections are saved filter-and-query combinations, each showing a live count. Filters is a set of facet sub-trees (Language, Topic, Activity, License), each collapsible, each item showing its count. The counts are computed against the current filter state minus the facet's own selections, so they show what each option would add rather than a stale total. In the Discover view the tree is Trending (today, week, month), Categories, and Languages.

Expansion state for every tree node persists to `localStorage`, as do the panel widths and the table column layout. A head script applies saved widths before first paint so there is no layout flash on reload.

## Multi-select without checkboxes

Facet selection follows operating-system list conventions rather than checkboxes, because power users already have these gestures in muscle memory and checkboxes add visual noise to a dense tree. A plain click replaces the selection with just that item (or clears it if it was the only thing selected). Ctrl or Cmd click toggles an individual item while keeping the rest. Shift click selects a range from the anchor, where the anchor is the last item clicked without Shift. The anchor is tracked per facet, so a range select in Language does not disturb the selection in Topic. The anchor follows the rendered order, which is sorted by count, so the range is snapshotted at render time.

This behavior is not announced in the UI. Experienced users discover it by trying, and a hint line was deliberately removed as clutter.

## Main pane and the datagrid

The main pane defaults to a datagrid (table) view, with grid and list as alternates via the view toggle. The datagrid is the default because it is the densest, most scannable presentation for a large set, and the project is built for people with large sets.

Vertically, the main pane is a flex column rather than a fixed-row grid. Its header rows (the toolbar, the optional natural-language hint, the optional Discover banner) size to their content, and the results pane takes all remaining height and scrolls within itself. A flex column is the right structure here because the number of header rows differs between views (Stars has a toolbar and a hint row, Discover has a banner and a toolbar), so a fixed two-row grid template would put the flexible track on the wrong child and either strand the results in a zero-height row or stretch a header to fill the pane. The rule to preserve: header elements are `flex: 0 0 auto`, the results element is `flex: 1` with `min-height: 0` and its own scroll, and the main pane itself carries `min-height: 0` so the results scroll instead of overflowing.

The datagrid columns are reorderable by dragging a header (a blue inset line shows whether the drop lands before or after the target) and resizable by dragging a header's right edge (the table reflows live as you drag). Column order and widths persist. The header is sticky.

## Selection and the browser pane

Clicking a row selects the repository and opens the browser pane on the right. On the first selection the current view is remembered so it can be restored on close. While a repository is selected the main pane is forced into the narrow list view, because a full datagrid at master-list width would be cramped; closing the selection restores the remembered view.

The browser pane has three parts. A header carries the owner and name, the stars, language, license, and activity badges, the description, and the View on GitHub and Star buttons. A Files section shows a collapsible file tree whose contents are language-aware: the tree it renders for a repository reflects that repository's own language, so a Rust repo shows manifests like `Cargo.toml`, a Node repo shows a `package.json`, a Go repo shows `go.mod` and `go.sum`, and so on, with source files using the right extension. These are properties of the repositories being browsed, not of the Stars Explorer's own stack. Markdown files are tinted with the success colour and config files with the warning colour. A README section renders a generated README with a title, badges (stars, language, license, and build and maintenance status derived from activity), the description as a blockquote, a features list built from the repo's topics, installation and usage code blocks with the right command and idiomatic syntax for the language, and the standard documentation, contributing, and license sections.

In the live system the file tree and README come from the GitHub API. In the reference build they are generated from the repository's metadata so the interaction can be demonstrated without network access; when wiring the real data, keep the same structure and swap the source.

## Discover view

Discover searches across GitHub rather than the user's stars. It swaps the sidebar for trending and category navigation, swaps the main content for a set of not-yet-starred repositories, and adds a Star action to each card that moves a repository into the user's set. The search-mode segments hide because discovery searches a different corpus. The same browser pane and selection behavior apply. The "Similar repositories" affordance only appears for repositories already in the user's stars, because topic-overlap similarity is not meaningful for a repo the user has not engaged with yet.

## Resize, theme, and keyboard

The panel resize handles mutate the layout tokens on `:root` during a drag and persist on release; double-clicking a handle resets that dimension to its default. The drag is unbounded: there is no minimum or maximum width on any pane, so a reader can drag one to fill the workbench or collapse it to nothing, and the drag clamps only at zero to keep a width from going negative. Below roughly 75em (the breakpoints are authored in em so they scale with the reader's font-size) the browser pane becomes an overlay rather than a grid column, and below about 48em the sidebar collapses to an overlay and the panes stack into a single column. The theme toggle flips `data-theme` between light and dark and persists the choice, overriding the system preference. Keyboard shortcuts include Cmd or Ctrl K and `/` to focus search, and Escape to close the selection.

## Extending the interface

When adding a pane or a view, drive its dimensions from layout tokens so the resize and persistence machinery applies for free. When adding a control, reach for an existing primitive (button, segmented toggle, tree item, chip) before writing new CSS, and reference colour and type tokens by name. When adding content that is machine-legible (an identifier, a count, a path, code), set it in the mono register so it reads consistently with the rest of the technical content.
