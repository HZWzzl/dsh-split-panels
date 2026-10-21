/**
 * Ambient types for the DSH web module loader. The client bundle is not a
 * normal ES module: it registers itself with `window.__ModuleLoader__`, whose
 * `factory(require)` hands back the host's shared module instances (React,
 * primitives, ...). Declaring that contract here keeps the bundle body
 * type-checkable without a synthetic import.
 */
interface DshModuleLoaderEntry {
  id: string;
  factory: (require: (id: string) => any) => Record<string, unknown>;
}

interface Window {
  __ModuleLoader__: {
    load(entry: DshModuleLoaderEntry): void;
  };
  /** Host boot manifest published by the web shell (release, versions...). */
  __DSH_BOOT__?: any;
  /** The plugin's own diagnostics API, installed at boot. */
  __dshSplitPanels?: Record<string, unknown>;
}
