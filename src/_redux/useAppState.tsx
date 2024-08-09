import { useSelector } from "react-redux";

import { AppState } from "./_root";

export const useAppState = () => {
  const {
    global: { osType, theme },
    main: {
      file: {
        workspace,
        project,
        initialFileUidToOpen,
        prevFileUid,
        renderableFileUid,
        fileTree,
        fileTreeViewState: {
          focusedItem: fFocusedItem,
          expandedItemsObj: fExpandedItemsObj,
          selectedItemsObj: fSelectedItemsObj,
        },
        hoveredFileUid,
        doingFileAction,
        lastFileAction,
        invalidFileNodes,
      },
      fileEvent: {
        past: fileEventPast,
        present: { fileAction },
        future: fileEventFuture,
      },
      nodeTree: {
        nodeTree,
        validNodeTree,
        needToSelectNodePaths,
        needToSelectCode,
        nodeTreeViewState: {
          focusedItem: nFocusedItem,
          expandedItemsObj: nExpandedItemsObj,
          selectedItemsObj: nSelectedItemsObj,
        },
        hoveredNodeUid,
        copiedNodeDisplayName,
      },
      nodeEvent: {
        past: nodeEventPast,
        present: {
          currentFileContent,
          selectedNodeUids,
          nodeUidPositions,
          currentFileUid,
        },
        future: nodeEventFuture,
      },
      designView: { iframeSrc, iframeLoading, linkToOpen, syncConfigs },
      codeView: {
        editingNodeUid: editingNodeUidInCodeView,
        codeViewTabSize,
        codeErrors,
      },
      processor: {
        runningAction,
        navigatorDropdownType,
        favicon,
        activePanel,
        clipboardData,
        showActionsPanel,
        showCodeView,
        showFilePanel,
        autoSave,
        wordWrap,
        didUndo,
        didRedo,
        loading,
      },
      reference: {
        filesReferenceData,
        htmlReferenceData,
        isContentProgrammaticallyChanged,
        isCodeTyping,
      },
      project: {
        projectHandlers,
        currentProjectFileHandle,
        fileHandlers,
        recentProject,
      },
      cmdk: {
        cmdkOpen,
        cmdkPages,
        currentCmdkPage,
        cmdkSearchContent,
        currentCommand,
        cmdkReferenceData,
      },
    },
  } = useSelector((state: AppState) => state);

  const fileEventPastLength = fileEventPast.length;
  const fileEventFutureLength = fileEventFuture.length;

  const nodeEventPastLength = nodeEventPast.length;
  const nodeEventFutureLength = nodeEventFuture.length;

  return {
    osType,
    theme,

    workspace,
    project,
    initialFileUidToOpen,
    currentFileUid,
    prevFileUid,
    renderableFileUid,
    fileTree,

    fFocusedItem,
    fExpandedItemsObj,
    fSelectedItemsObj,
    hoveredFileUid,

    doingFileAction,
    lastFileAction,
    invalidFileNodes,

    fileAction,
    fileEventPast,
    fileEventPastLength,
    fileEventFuture,
    fileEventFutureLength,

    nodeTree,
    validNodeTree,

    needToSelectNodePaths,
    needToSelectCode,

    nFocusedItem,
    nExpandedItemsObj,
    nSelectedItemsObj,
    hoveredNodeUid,
    copiedNodeDisplayName,

    currentFileContent,
    selectedNodeUids,
    nodeUidPositions,

    nodeEventPast,
    nodeEventPastLength,
    nodeEventFuture,
    nodeEventFutureLength,

    iframeSrc,
    iframeLoading,
    linkToOpen,
    syncConfigs,

    editingNodeUidInCodeView,
    codeViewTabSize,
    codeErrors,

    runningAction,

    navigatorDropdownType,
    favicon,

    activePanel,
    clipboardData,

    showActionsPanel,
    showCodeView,
    showFilePanel,

    autoSave,
    wordWrap,

    didUndo,
    didRedo,
    loading,

    filesReferenceData,
    htmlReferenceData,
    isContentProgrammaticallyChanged,
    isCodeTyping,

    projectHandlers,
    currentProjectFileHandle,
    fileHandlers,
    recentProject,

    cmdkOpen,
    cmdkPages,
    currentCmdkPage,

    cmdkSearchContent,
    currentCommand,
    cmdkReferenceData,
  };
};
