import { useCallback, useContext } from "react";

import { useDispatch } from "react-redux";

import { getValidNodeUids } from "@_node/helpers";
import { TNodeUid } from "@_node/types";
import { MainContext } from "@_redux/main";
import {
  collapseNodeTreeNodes,
  expandNodeTreeNodes,
  setSelectedNodeUids,
} from "@_redux/main/nodeTree";
import { useAppState } from "@_redux/useAppState";

export function useNodeViewState() {
  const dispatch = useDispatch();
  const {
    fileTree,
    currentFileUid,
    prevRenderableFileUid,

    validNodeTree,
    nSelectedItems: selectedItems,
    nSelectedItemsObj: selectedItemsObj,
  } = useAppState();
  const { addRunningActions, removeRunningActions } = useContext(MainContext);

  const cb_focusNode = useCallback(() => {
    removeRunningActions(["nodeTreeView-focus"]);
  }, [removeRunningActions]);

  const cb_selectNode = useCallback(
    (uids: TNodeUid[]) => {
      addRunningActions(["nodeTreeView-select"]);
      // validate
      const _uids = getValidNodeUids(validNodeTree, uids);
      if (_uids.length === selectedItems.length) {
        let same = true;
        for (const _uid of _uids) {
          if (!selectedItemsObj[_uid]) {
            same = false;
            break;
          }
        }
        if (same) {
          removeRunningActions(["nodeTreeView-select"]);
          return;
        }
      }
      dispatch(setSelectedNodeUids(_uids));

      // update file - WIP
      if (currentFileUid !== prevRenderableFileUid) {
        // const file = fileTree[prevRenderableFileUid];
        // const fileData = file.data as TFileNodeData;
        // dispatch(setCurrentFileUid(prevRenderableFileUid));
        // dispatch(setCurrentFileContent(fileData.content));
        // dispatch(selectFileTreeNodes([prevRenderableFileUid]));
        // dispatch({ type: NodeTree_Event_ClearActionType });
      }

      removeRunningActions(["nodeTreeView-select"]);
    },
    [
      addRunningActions,
      removeRunningActions,
      fileTree,
      currentFileUid,
      prevRenderableFileUid,
      validNodeTree,
      selectedItems,
      selectedItemsObj,
    ],
  );

  const cb_expandNode = useCallback(
    (uid: TNodeUid) => {
      addRunningActions(["nodeTreeView-arrow"]);

      dispatch(expandNodeTreeNodes([uid]));

      removeRunningActions(["nodeTreeView-arrow"]);
    },
    [addRunningActions, removeRunningActions],
  );

  const cb_collapseNode = useCallback(
    (uid: TNodeUid) => {
      addRunningActions(["nodeTreeView-arrow"]);

      dispatch(collapseNodeTreeNodes([uid]));

      removeRunningActions(["nodeTreeView-arrow"]);
    },
    [addRunningActions, removeRunningActions],
  );

  return { cb_focusNode, cb_selectNode, cb_expandNode, cb_collapseNode };
}
