import { TNodeTreeData, TNodeUid } from "@_api/types";

import { TTreeViewState } from "../types";
import { TCodeSelection } from "@src/codeView";

export type TNodeTreeReducerState = {
  nodeTree: TNodeTreeData;
  validNodeTree: TNodeTreeData;

  needToSelectNodePaths: string[] | null;
  needToSelectCode: TCodeSelection | null;

  nodeTreeViewState: TTreeViewState;
  hoveredNodeUid: TNodeUid;
  copiedNodeDisplayName: string[];
};
