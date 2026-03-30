/**
 * Event bus (style WordPress add_action / apply_filters).
 * Server-only : enregistrer les listeners au demarrage (bootstrap serveur).
 */

type ActionHandler<T> = (payload: T) => void | Promise<void>;
type FilterHandler<T> = (value: T) => T | Promise<T>;

const actions = new Map<string, ActionHandler<unknown>[]>();
const filters = new Map<string, FilterHandler<unknown>[]>();
const actionPriority = new Map<string, number[]>();

function getActionList(name: string): ActionHandler<unknown>[] {
  if (!actions.has(name)) actions.set(name, []);
  return actions.get(name)!;
}

function getFilterList(name: string): FilterHandler<unknown>[] {
  if (!filters.has(name)) filters.set(name, []);
  return filters.get(name)!;
}

/**
 * Enregistre un listener d action (fire-and-forget cote appelant possible).
 * priority : plus petit = execute en premier (defaut 10).
 */
export function addAction<T = unknown>(
  name: string,
  handler: ActionHandler<T>,
  priority = 10
): void {
  const list = getActionList(name);
  const priorities = actionPriority.get(name) ?? [];
  let idx = list.length;
  for (let i = 0; i < priorities.length; i++) {
    if (priority < priorities[i]) {
      idx = i;
      break;
    }
    idx = i + 1;
  }
  list.splice(idx, 0, handler as ActionHandler<unknown>);
  priorities.splice(idx, 0, priority);
  actionPriority.set(name, priorities);
}

/** Execute tous les handlers (sequenciel). Erreurs loggees, non propagees. */
export async function doAction<T = unknown>(name: string, payload: T): Promise<void> {
  const list = getActionList(name);
  for (const h of list) {
    try {
      await h(payload);
    } catch (e) {
      console.error(`[Hooks] doAction("${name}")`, e);
    }
  }
}

export function addFilter<T = unknown>(
  name: string,
  handler: FilterHandler<T>
): void {
  getFilterList(name).push(handler as FilterHandler<unknown>);
}

/** Passe value dans la chaine de filtres (ordre d enregistrement). */
export async function applyFilters<T>(name: string, value: T): Promise<T> {
  let out: unknown = value;
  for (const h of getFilterList(name)) {
    out = await h(out);
  }
  return out as T;
}

export const Hooks = { addAction, doAction, addFilter, applyFilters };
