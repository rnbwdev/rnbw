import { THtmlReferenceData } from "@_types/main";

export type TNode = {
  uid: TNodeUid;
  parentUid: TNodeUid | null;

  displayName: string;

  isEntity: boolean;
  children: TNodeUid[];

  data: TNodeData;

  uniqueNodePath?: string;
};

export type TNodeUid = string;
export type TValidNodeUid = number | "ROOT" | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TNodeData = TBasicNodeData & { [propName: string]: any };

export type TBasicNodeData = {
  valid: boolean;
};

export type TNodeTreeData = {
  [uid: TNodeUid]: TNode;
};

export type TNodeSourceCodeLocation = {
  startLine: number;
  startCol: number;
  startOffset: number;
  endLine: number;
  endCol: number;
  endOffset: number;
  startTag?: Omit<TNodeSourceCodeLocation, "startTag" | "endTag">;
  endTag?: Omit<TNodeSourceCodeLocation, "startTag" | "endTag">;
};

export type TNodePositionInfo = {
  decorationId?: string | null;
  location: TNodeSourceCodeLocation;
};

export type TNodeActionType =
  | "add"
  | "remove"
  | "cut"
  | "copy"
  | "paste"
  | "duplicate"
  | "move"
  | "rename" // "turn into" for node tree - "rename" for file tree
  | "group"
  | "ungroup"
  | "text-edit";

export type TNodeReferenceData = THtmlReferenceData;
