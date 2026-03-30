export type BuilderSelection =
  | { kind: "none" }
  | { kind: "row"; rowId: string }
  | { kind: "column"; rowId: string; colId: string }
  | { kind: "block"; rowId: string; colId: string; blockId: string };

export type FocusColumn = { rowId: string; colId: string };
