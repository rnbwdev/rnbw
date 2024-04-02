/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useContext } from "react";

import { NodeActions } from "@_node/node";
import { MainContext } from "@_redux/main";
import { useAppState } from "@_redux/useAppState";
import { LogAllow } from "@_constants/global";
import { useDispatch } from "react-redux";
import { setIsContentProgrammaticallyChanged } from "@_redux/main/reference";
import { TNodeUid } from "@_node/index";

export const useAttributeHandler = () => {
  const { nodeTree, selectedNodeUids } = useAppState();
  const { monacoEditorRef } = useContext(MainContext);
  const dispatch = useDispatch();

  const changeAttribute = useCallback(
    ({
      uid,
      attrName,
      attrValue,
      cb,
    }: {
      uid: TNodeUid;
      attrName: string;
      attrValue: string;
      cb?: any;
    }) => {
      const codeViewInstance = monacoEditorRef.current;
      const codeViewInstanceModel = codeViewInstance?.getModel();

      if (!attrName) return;

      if (!codeViewInstance || !codeViewInstanceModel) {
        LogAllow &&
          console.error(
            `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
          );
        return;
      }

      dispatch(setIsContentProgrammaticallyChanged(true));

      NodeActions.addAttr({
        dispatch,
        attrName,
        attrValue,
        nodeTree,
        focusedItem: uid,
        selectedItems: selectedNodeUids,
        codeViewInstanceModel,
        cb,
        fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
      });
    },
    [nodeTree, monacoEditorRef, selectedNodeUids],
  );

  const deleteAttribute = useCallback(
    ({
      uid,
      attrName,
      attrValue,
      cb,
    }: {
      uid: TNodeUid;
      attrName: string;
      attrValue?: string;
      cb?: any;
    }) => {
      const codeViewInstance = monacoEditorRef.current;
      const codeViewInstanceModel = codeViewInstance?.getModel();

      if (!attrName) return;

      if (!codeViewInstance || !codeViewInstanceModel) {
        LogAllow &&
          console.error(
            `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
          );
        return;
      }
      dispatch(setIsContentProgrammaticallyChanged(true));

      NodeActions.removeAttr({
        dispatch,
        attrName,
        attrValue,
        nodeTree,
        selectedItems: selectedNodeUids,
        focusedItem: uid,
        codeViewInstanceModel,
        cb,
        fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
      });
    },
    [nodeTree, monacoEditorRef, selectedNodeUids],
  );
  return { changeAttribute, deleteAttribute };
};
