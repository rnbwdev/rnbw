import { useContext, useEffect, useRef } from "react";

import morphdom from "morphdom";
import { useDispatch } from "react-redux";

import { getNodeUidByCodeSelection } from "@_components/main/codeView";
import { markSelectedElements } from "@_components/main/stageView/iFrame/helpers";
import { LogAllow } from "@_constants/global";
import {
  _writeIDBFile,
  parseFile,
  PreserveRnbwNode,
  StageNodeIdAttr,
} from "@_node/file";
import { getNodeUidsFromPaths } from "@_node/helpers";
import { TNodeUid } from "@_node/types";
import { MainContext } from "@_redux/main";
import { setCurrentCommand } from "@_redux/main/cmdk";
import {
  setCodeErrors,
  setEditingNodeUidInCodeView,
} from "@_redux/main/codeView";
import {
  setDoingFileAction,
  setFileTreeNodes,
  setInitialFileUidToOpen,
  setPrevFileUid,
} from "@_redux/main/fileTree";
import {
  expandNodeTreeNodes,
  focusNodeTreeNode,
  selectNodeTreeNodes,
  setExpandedNodeTreeNodes,
  setNeedToSelectCode,
  setNeedToSelectNodePaths,
  setNeedToSelectNodeUids,
  setNodeTree,
  setSelectedNodeUids,
  setValidNodeTree,
} from "@_redux/main/nodeTree";
import { setIframeSrc, setNeedToReloadIframe } from "@_redux/main/stageView";
import { useAppState } from "@_redux/useAppState";

import {
  getNeedToExpandNodeUids,
  getNodeUidToBeSelectedAtFirst,
  getPreviewPath,
  getValidNodeTree,
  markChangedFolders,
} from "../helpers";
import { setLoadingFalse, setLoadingTrue } from "@_redux/main/processor";
import { toast } from "react-toastify";

export const useNodeTreeEvent = () => {
  const dispatch = useDispatch();
  const {
    currentCommand,

    fileTree,
    initialFileUidToOpen,
    currentFileUid,
    prevFileUid,

    currentFileContent,
    selectedNodeUids,

    validNodeTree,
    needToSelectNodePaths,
    needToSelectCode,
    nExpandedItems,
    nFocusedItem,
    syncConfigs,
    webComponentOpen,
  } = useAppState();
  const { addRunningActions, removeRunningActions, iframeRefRef } =
    useContext(MainContext);

  const isSelectedNodeUidsChanged = useRef(false);
  const isCurrentFileContentChanged = useRef(false);
  const isCodeErrorsExist = useRef(false);

  useEffect(() => {
    isSelectedNodeUidsChanged.current = false;
    isCurrentFileContentChanged.current = false;
  }, [selectedNodeUids, currentFileContent]);

  useEffect(() => {
    isSelectedNodeUidsChanged.current = true;
    // focus node
    dispatch(
      focusNodeTreeNode(
        selectedNodeUids.length > 0
          ? selectedNodeUids[selectedNodeUids.length - 1]
          : "",
      ),
    );
    // select nodes
    dispatch(selectNodeTreeNodes(selectedNodeUids));
  }, [selectedNodeUids]);

  useEffect(() => {
    isCurrentFileContentChanged.current = true;
    // validate
    if (!fileTree[currentFileUid] || webComponentOpen) return;

    addRunningActions(["processor-update"]);

    // parse new file content
    const file = structuredClone(fileTree[currentFileUid]);
    const fileData = file.data;
    const { contentInApp, nodeTree } = parseFile(
      fileData.ext,
      currentFileContent,
    );

    fileData.content = currentFileContent;

    fileData.contentInApp = contentInApp;

    fileData.changed = fileData.content !== fileData.orgContent;
    if (file.parentUid) {
      markChangedFolders(fileTree, file, dispatch, fileData.changed);
    }

    // when "Save" while text-editing, we need to call "Save" command after file-content updated.
    // after fileTree has been updated exactly. so when "Save" while text-editing, we should call "SaveForce" first.
    if (currentCommand?.action === "SaveForce") {
      dispatch(setCurrentCommand({ action: "Save" }));
    }

    // sync file-tree
    dispatch(setFileTreeNodes([file]));
    (async () => {
      // update idb
      dispatch(setDoingFileAction(true));
      dispatch(setLoadingTrue());
      try {
        const previewPath = getPreviewPath(fileTree, file);
        await _writeIDBFile(previewPath, fileData.contentInApp as string);
        if (fileData.ext === "html") {
          dispatch(setIframeSrc(`rnbw${previewPath}`));
        }
      } catch (err) {
        LogAllow && console.error(err);
      }
      dispatch(setDoingFileAction(false));
      dispatch(setLoadingFalse());
    })();

    // ---
    // code-view is already synced
    // ---

    // sync stage-view
    if (prevFileUid !== currentFileUid) {
      LogAllow && console.log("need to refresh iframe");
      dispatch(setNeedToReloadIframe(true));
    } else {
      // dom-diff using morph
      if (fileData.ext === "html") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const iframe: any = document.getElementById("iframeId");
        if (iframe) {
          const iframeDoc = iframe.contentDocument;
          const iframeHtml = iframeDoc.getElementsByTagName("html")[0];
          const updatedHtml = contentInApp;
          if (!iframeHtml || !updatedHtml) return;
          try {
            morphdom(iframeHtml, updatedHtml, {
              onBeforeElUpdated: function (fromEl, toEl) {
                //check if the node is script or style
                if (
                  fromEl.nodeName === "SCRIPT" ||
                  fromEl.nodeName === "LINK" ||
                  fromEl.nodeName === "STYLE"
                ) {
                  return false;
                }
                const fromElRnbwId = fromEl.getAttribute(StageNodeIdAttr);

                if (toEl.nodeName.includes("-")) return false;
                if (
                  syncConfigs?.matchIds &&
                  !!fromElRnbwId &&
                  syncConfigs.matchIds.includes(fromElRnbwId)
                ) {
                  return true;
                } else if (fromEl.isEqualNode(toEl)) {
                  return false;
                } else if (toEl.nodeName === "HTML") {
                  //copy the attributes
                  for (let i = 0; i < fromEl.attributes.length; i++) {
                    toEl.setAttribute(
                      fromEl.attributes[i].name,
                      fromEl.attributes[i].value,
                    );
                  }
                  if (fromEl.isEqualNode(toEl)) return false;
                }
                return true;
              },
              onElUpdated: function (el) {
                if (el.nodeName === "HTML") {
                  //copy the attributes
                  for (let i = 0; i < el.attributes.length; i++) {
                    iframeHtml.setAttribute(
                      el.attributes[i].name,
                      el.attributes[i].value,
                    );
                  }
                }
              },
              onBeforeNodeDiscarded: function (node: Node) {
                const elementNode = node as Element;
                const ifPreserveNode = elementNode.getAttribute
                  ? elementNode.getAttribute(PreserveRnbwNode)
                  : false;
                if (ifPreserveNode) {
                  return false;
                }
                // script and style should not be discarded
                if (
                  elementNode.nodeName === "SCRIPT" ||
                  elementNode.nodeName === "LINK" ||
                  elementNode.nodeName === "STYLE"
                ) {
                  return false;
                }

                return true;
              },
            });
            isCodeErrorsExist.current = false;
          } catch (err) {
            isCodeErrorsExist.current = true;

            toast("Some changes in the code are incorrect", {
              type: "error",
              toastId: "Some changes in the code are incorrect",
            });
            console.error(err, "error");
          }
        }
      }
    }
    dispatch(setCodeErrors(isCodeErrorsExist.current));
    if (isCodeErrorsExist.current) return;

    // sync node-tree
    dispatch(setNodeTree(nodeTree));
    const _validNodeTree = getValidNodeTree(nodeTree);
    dispatch(setValidNodeTree(_validNodeTree));

    const uid = getNodeUidToBeSelectedAtFirst(_validNodeTree);
    if (initialFileUidToOpen !== "" && fileTree[initialFileUidToOpen]) {
      LogAllow && console.log("it's a new project");
      dispatch(setInitialFileUidToOpen(""));
      dispatch(setSelectedNodeUids([uid]));
      dispatch(
        setExpandedNodeTreeNodes(
          getNeedToExpandNodeUids(_validNodeTree, [uid]),
        ),
      );
    } else if (prevFileUid !== currentFileUid) {
      dispatch(setLoadingTrue());
      LogAllow && console.log("it's a new file");
      dispatch(setSelectedNodeUids([uid]));
      dispatch(
        setExpandedNodeTreeNodes(
          getNeedToExpandNodeUids(_validNodeTree, [uid]),
        ),
      );
    } else {
      markSelectedElements(iframeRefRef.current, [nFocusedItem], nodeTree);
      const validExpandedItems = nExpandedItems.filter(
        (uid) => _validNodeTree[uid] && _validNodeTree[uid].isEntity === false,
      );
      const needToExpandItems: TNodeUid[] = isSelectedNodeUidsChanged.current
        ? getNeedToExpandNodeUids(_validNodeTree, selectedNodeUids)
        : [];
      dispatch(
        setExpandedNodeTreeNodes([...validExpandedItems, ...needToExpandItems]),
      );

      if (!isSelectedNodeUidsChanged.current) {
        // this change is from 'node actions' or 'typing in code-view'
        const _selectedNodeUids: TNodeUid[] = [];

        if (needToSelectNodePaths) {
          LogAllow && console.log("it's a rnbw-change from node-actions");
          // this means we called `NodeActions` and we need to select predicted `needToSelectNodeUids`
          // in the case, `NodeActions -> setCurrentFileContent` and `setNeedToSelectNodeUids` dispatch actions are considered as an one event in the node-event-history.
          const needToSelectNodeUids = getNodeUidsFromPaths(
            _validNodeTree,
            needToSelectNodePaths,
          );
          _selectedNodeUids.push(...needToSelectNodeUids);
          dispatch(setNeedToSelectNodeUids(needToSelectNodeUids));
          dispatch(setNeedToSelectNodePaths(null));
        } else if (needToSelectCode) {
          LogAllow && console.log("it's a rnbw-change from code-view");
          // it's a typing change in code-view and we need to select currently `cursored node` in code-view.
          // in the case, `NodeActions -> setCurrentFileContent` and `setNeedToSelectNodeUids` dispatch actions are considered as an one event in the node-event-history.
          const needToSelectNodeUid = getNodeUidByCodeSelection(
            needToSelectCode,
            nodeTree,
            _validNodeTree,
          );
          dispatch(setEditingNodeUidInCodeView(needToSelectNodeUid));
          needToSelectNodeUid &&
            _selectedNodeUids.push(needToSelectNodeUid) &&
            dispatch(setNeedToSelectNodeUids([needToSelectNodeUid]));
          dispatch(setNeedToSelectCode(null));
        }

        // remark selected elements on stage-view
        // it is removed through dom-diff
        // this part is for when the selectedNodeUids is not changed cuz of the same code-format
        markSelectedElements(iframeRefRef.current, _selectedNodeUids, nodeTree);
      }
    }

    // update prevFileUid
    if (prevFileUid !== currentFileUid) {
      dispatch(setPrevFileUid(currentFileUid));
    }
    dispatch(setLoadingFalse());
    removeRunningActions(["processor-update"]);
  }, [currentFileContent, currentFileUid]);

  // expand nodes that need to be expanded when it's just select-event
  useEffect(() => {
    if (!isCurrentFileContentChanged.current) {
      const needToExpandItems = getNeedToExpandNodeUids(
        validNodeTree,
        selectedNodeUids,
      );
      dispatch(expandNodeTreeNodes(needToExpandItems));
    }
  }, [selectedNodeUids]);
};
