import undoable from "redux-undo";

import { TNodePositionInfo, TNodeUid } from "@_api/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import {
  NodeTree_Event_ClearActionType,
  NodeTree_Event_JumpToPastActionType,
  NodeTree_Event_RedoActionType,
  NodeTree_Event_StoreLimit,
  NodeTree_Event_UndoActionType,
} from "./constants";
import { TNodeEventReducerState } from "./types";

const nodeEventReducerInitialState: TNodeEventReducerState = {
  currentFileContent: "",
  selectedNodeUids: [],
  nodeUidPositions: new Map(),
  currentFileUid: "",
};
const nodeEventSlice = createSlice({
  name: "nodeEvent",
  initialState: nodeEventReducerInitialState,
  reducers: {
    setCurrentFileContent(state, action: PayloadAction<string>) {
      const currentFileContent = action.payload;
      state.currentFileContent = currentFileContent;
    },
    setSelectedNodeUids(state, action: PayloadAction<TNodeUid[]>) {
      const selectedNodeUids = action.payload;
      state.selectedNodeUids = [...selectedNodeUids];
    },
    setNodeUidPositions(
      state,
      action: PayloadAction<Map<TNodeUid, TNodePositionInfo>>,
    ) {
      const nodeUidPositions = action.payload;
      state.nodeUidPositions = nodeUidPositions;
    },
    setNeedToSelectNodeUids(state, action: PayloadAction<TNodeUid[]>) {
      const needToSelectNodeUids = action.payload;
      state.selectedNodeUids = needToSelectNodeUids;
    },
    setCurrentFileUid(state, action: PayloadAction<TNodeUid>) {
      const currentFileUid = action.payload;
      state.currentFileUid = currentFileUid;
    },
  },
});
export const {
  setCurrentFileContent,
  setSelectedNodeUids,
  setNodeUidPositions,
  setNeedToSelectNodeUids,
  setCurrentFileUid,
} = nodeEventSlice.actions;
export const NodeEventReducer = undoable(nodeEventSlice.reducer, {
  limit: NodeTree_Event_StoreLimit,
  undoType: NodeTree_Event_UndoActionType,
  redoType: NodeTree_Event_RedoActionType,
  clearHistoryType: NodeTree_Event_ClearActionType,
  jumpToPastType: NodeTree_Event_JumpToPastActionType,

  groupBy: (action, currentState, previousHistory) => {
    if (previousHistory.index) {
      if (
        action.type === "nodeEvent/setCurrentFileContent" ||
        action.type === "nodeEvent/setNodeUidPositions"
      ) {
        return `node-action-${previousHistory.index}`;
      } else if (action.type === "nodeEvent/setNeedToSelectNodeUids") {
        return `node-action-${previousHistory.index - 1}`;
      }
    }
    return null;
  },
  filter: (action, currentState) => {
    const ignoreActionTypes = [
      "nodeEvent/setCurrentFileUid",
      "nodeEvent/setNodeUidPositions",
    ];
    if (ignoreActionTypes.includes(action.type)) return false;
    if (currentState.currentFileUid.split(".")[1] !== "html") return false;
    return true;
  },
});
