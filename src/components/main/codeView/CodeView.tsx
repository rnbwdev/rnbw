import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import * as monaco from "monaco-editor";
import { useDispatch } from "react-redux";

import { RootNodeUid } from "@_constants/main";
import { TFileNodeData, TNodeUid } from "@_node/index";
import { MainContext } from "@_redux/main";
import { setSelectedNodeUids } from "@_redux/main/nodeTree";
import { setActivePanel } from "@_redux/main/processor";
import { useAppState } from "@_redux/useAppState";
import { Editor, loader } from "@monaco-editor/react";

import { useCmdk, useEditor } from "./hooks";
import { getNodeUidByCodeSelection } from "./helpers";
import { setEditingNodeUidInCodeView } from "@_redux/main/codeView";

loader.config({ monaco });

export default function CodeView() {
  const dispatch = useDispatch();
  const {
    fileTree,
    currentFileUid,
    currentFileContent,

    nodeTree,
    validNodeTree,
    nFocusedItem,

    activePanel,
    showCodeView,

    editingNodeUidInCodeView,
    isCodeTyping,
    codeErrors
  } = useAppState();
  const { monacoEditorRef } = useContext(MainContext);

  const {
    handleEditorDidMount,
    handleOnChange,
    handleKeyDown,
    theme,

    language,
    updateLanguage,

    editorConfigs,

    codeSelection,
  } = useEditor();
  useCmdk();

  monacoEditorRef.current?.onKeyDown(handleKeyDown);

  const onPanelClick = useCallback(() => {
    dispatch(setActivePanel("code"));
  }, []);

  // language sync
  useEffect(() => {
    const file = fileTree[currentFileUid];
    if (!file) return;

    const fileData = file.data as TFileNodeData;
    const extension = fileData.ext;
    extension && updateLanguage(extension);
  }, [fileTree, currentFileUid]);

  //scroll to top on file change
  useEffect(() => {
    const monacoEditor = monacoEditorRef.current;
    if (!monacoEditor) return;
    monacoEditor.setScrollTop(0);
  }, [currentFileUid]);

  // focusedItem -> code select
  const focusedItemRef = useRef<TNodeUid>("");

  const hightlightFocusedNodeSourceCode = useCallback(() => {
    const monacoEditor = monacoEditorRef.current;
    if (!monacoEditor) return;

    const node = validNodeTree[nFocusedItem];
    const sourceCodeLocation = node.data.sourceCodeLocation;
    if (!sourceCodeLocation) return;

    const {
      startLine: startLineNumber,
      startCol: startColumn,
      endCol: endColumn,
      endLine: endLineNumber,
    } = sourceCodeLocation;

    monacoEditor.setSelection({
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
    });
    monacoEditor.revealRangeInCenter(
      {
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn,
      },
      1,
    );
    
  }, [validNodeTree, nFocusedItem, activePanel]);

  useEffect(() => {
    if(isCodeTyping) return;
    const monacoEditor = monacoEditorRef.current;
    if (!monacoEditor) return;

    if (focusedItemRef.current === nFocusedItem) {
      if (!codeSelection) return;

      const node = validNodeTree[nFocusedItem];
      const sourceCodeLocation = node.data.sourceCodeLocation;

      if (!sourceCodeLocation) return;
      const {
        startLine: startLineNumber,
        startCol: startColumn,
        endCol: endColumn,
        endLine: endLineNumber,
      } = sourceCodeLocation;

      monacoEditor.setSelection({
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn,
      });
      monacoEditor.setSelection({
        startLineNumber: codeSelection?.startLineNumber,
        startColumn: codeSelection?.startColumn,
        endLineNumber: codeSelection?.endLineNumber,
        endColumn: codeSelection?.endColumn,
      });
      return;
    }
    focusedItemRef.current = nFocusedItem;

    // skip typing in code-view
    if (editingNodeUidInCodeView === nFocusedItem) {
      focusedItemRef.current = nFocusedItem;
      dispatch(setEditingNodeUidInCodeView(""));
      return;
    }

    if (nFocusedItem === RootNodeUid || !validNodeTree[nFocusedItem]) {
      monacoEditor.setSelection({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      });
    } else {
      hightlightFocusedNodeSourceCode();
    }
  }, [nFocusedItem]);

  useEffect(() => {
    if(isCodeTyping) return;
    if(nFocusedItem === "") return;
    const monacoEditor = monacoEditorRef.current;
    if (!monacoEditor) return;
    const node = validNodeTree[nFocusedItem];
    if(!node) return;
    const sourceCodeLocation = node.data.sourceCodeLocation;
    if (!sourceCodeLocation) return;
    // skip typing in code-view
    if (editingNodeUidInCodeView === nFocusedItem) {
      focusedItemRef.current = nFocusedItem;
      dispatch(setEditingNodeUidInCodeView(""));
      return;
    }
    const {
      startLine: startLineNumber,
      startCol: startColumn,
      endCol: endColumn,
      endLine: endLineNumber,
    } = sourceCodeLocation;
    monacoEditor.setSelection({
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
    });
  }, [nodeTree]);

  // code select -> selectedUids
  useEffect(() => {
    if (!codeSelection || isCodeTyping) return;

    const file = fileTree[currentFileUid];
    if (!file) return;

    const ext = file.data.ext;
    if (ext !== "html") return;

    if (!validNodeTree[RootNodeUid]) return;

    const focusedNodeUid = getNodeUidByCodeSelection(
      codeSelection,
      nodeTree,
      validNodeTree,
    );
    if (focusedNodeUid && focusedItemRef.current !== focusedNodeUid) {
      focusedItemRef.current = focusedNodeUid;
      focusedNodeUid && dispatch(setSelectedNodeUids([focusedNodeUid]));
    }
  }, [codeSelection]);

  return useMemo(() => {
    return (
      <>
        <div
          id="CodeView"
          onDragCapture={(e) => {
            e.preventDefault();
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          style={{
            width: "100%",
            height: "100%",
            zIndex: 999,
            overflow: "hidden",
          }}
          className={`border-left background-primary ${codeErrors && "outline border outline-negative"}`}
          onClick={onPanelClick}
        >
          <Editor
            onMount={handleEditorDidMount}
            theme={theme}
            language={language}
            defaultValue={""}
            value={currentFileContent}
            onChange={handleOnChange}
            loading={""}
            options={
              editorConfigs as monaco.editor.IStandaloneEditorConstructionOptions
            }
          />
        </div>
      </>
    );
  }, [
    onPanelClick,
    showCodeView,

    handleEditorDidMount,
    handleOnChange,

    theme,
    language,
    currentFileContent,
    editorConfigs,
    codeErrors,
  ]);
}
