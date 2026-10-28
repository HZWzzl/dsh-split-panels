/**
 * Shared domain types for dsh-split-panels (ambient/global: the client bundle
 * is a classic script registered with window.__ModuleLoader__, so source-level
 * `import`/`export` would change its evaluation semantics).
 *
 * These describe the plugin's OWN data model only (split tree, colors,
 * diagnostics). Host/stock-session shapes stay `any` on purpose: the web
 * client bundle talks to several stock plugin versions at once, so a pinned
 * structural type would lie as often as it helps. Type the seam, not the world.
 */

/** One pane: a session id rendered as a leaf of the split tree. */
interface SplitLeaf {
  t: "leaf";
  id: string;
  /**
   * A pane opened OPTIMISTICALLY for a New Session click: it renders the
   * plugin's lightweight pending composer until the host returns the real
   * session id, which then replaces `id`. Pending leaves are never persisted
   * (see stripPendingLeaves in client.ts).
   */
  pending?: boolean;
}

/** Split direction: horizontal panes or vertical panes. */
type SplitDir = "h" | "v";

/** An internal tree node holding two children and their size fractions. */
interface SplitBranch {
  t: "split";
  sid: string;
  dir: SplitDir;
  kids: SplitNode[];
  sizes: number[];
}

/** A node of the persisted pane layout. */
type SplitNode = SplitLeaf | SplitBranch;

/** The persisted split workspace: the tree plus the focused session id. */
interface SplitTree {
  root: SplitNode | null;
  focus: string | null;
}

/** Persisted per-session pane colors (`dsh.split-panels.colors.v1`). */
type SessionColorMap = Record<string, string>;

/** A session's list-row summary, as far as this plugin reads it. */
interface SessionSummary {
  id: string;
  title?: string;
  displayTitle?: string;
  cwd?: string;
  running?: boolean;
  blank?: boolean;
  awaitingFirstTurn?: boolean;
  promptAttempted?: boolean;
}

/**
 * Diagnostics returned by `window.__dshSplitPanels.health()`. Every field is
 * plain data: the API is safe to call at any time, including from a console
 * while the stock view is in charge.
 */
interface HealthSummary {
  pluginVersion: string;
  hostRelease?: string | null;
  testedHost?: boolean | null;
  testedReleases: string[];
  enabled: boolean;
  mobile: boolean;
  safeMode: boolean;
  active: boolean;
  geometryBlocked: boolean;
  panes: number;
  maxPanes: number;
  blockedReason: string;
  failures: number;
  lastError: string | null;
  geometry: { ok: boolean; left: number; right: number; top: number; bottom: number };
  editorRoots: unknown[];
  [key: string]: unknown;
}
