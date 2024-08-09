import { LogAllow } from "@src/rnbwTSX";
import { RootNodeUid } from "@src/rnbwTSX";
import { StageNodeIdAttr } from "@_api/file";

import { getObjKeys } from "@src/helper";
import { MainContext } from "@_redux/main";
import {
  NodeTree_Event_RedoActionType,
  NodeTree_Event_UndoActionType,
  setCopiedNodeDisplayName,
  setNeedToSelectNodePaths,
  setSelectedNodeUids,
} from "@_redux/main/nodeTree";
import { setDidRedo, setDidUndo } from "@_redux/main/processor";
import { useAppState } from "@_redux/useAppState";
import {
  Iadd,
  Icopy,
  Iduplicate,
  Igroup,
  Imove,
  Ipaste,
  Iremove,
  Iungroup,
  IupdateEditableElement,
  IupdateSettings,
} from "@_types/elements.types";

import { Range } from "monaco-editor";
import { useCallback, useContext, useMemo } from "react";
import { useDispatch } from "react-redux";
import { PrettyCode, isValidNode, useElementHelper } from "./useElementsHelper";
import { toast } from "react-toastify";
import * as parse5 from "parse5";
import { setIsContentProgrammaticallyChanged } from "@_redux/main/reference";

export default function useElements() {
  const {
    nSelectedItemsObj,
    htmlReferenceData,
    validNodeTree,
    nFocusedItem,
    nodeEventPastLength,
    currentFileContent,
    nodeEventPast,
    selectedNodeUids,
    nodeEventFutureLength,
    copiedNodeDisplayName,
  } = useAppState();
  const { monacoEditorRef } = useContext(MainContext);
  const dispatch = useDispatch();
  const {
    setEditorModelValue,
    getEditorModelWithCurrentCode,
    checkAllResourcesAvailable,
    copyAndCutNode,
    findNodeToSelectAfterAction,
    sortUidsAsc,
    sortUidsDsc,
    isPastingAllowed,
  } = useElementHelper();

  const codeViewInstanceModel = monacoEditorRef.current?.getModel();
  const selectedItems = useMemo(
    () => getObjKeys(nSelectedItemsObj),
    [nSelectedItemsObj],
  );

  //Create
  const add = async (params: Iadd) => {
    const { tagName, skipUpdate } = params;
    if (!checkAllResourcesAvailable() || !codeViewInstanceModel) return;

    const { isAllowed, selectedUids } = isPastingAllowed({
      selectedItems,
      nodeToAdd: [tagName],
    });
    if (!isAllowed) {
      toast("Adding not allowed", { type: "error" });
      return;
    }

    const helperModel = getEditorModelWithCurrentCode();

    const commentTag = "!--...--";
    const HTMLElement =
      htmlReferenceData.elements[tagName === commentTag ? "comment" : tagName];

    let openingTag = HTMLElement?.Tag || "";
    if (HTMLElement?.Attributes) {
      openingTag = openingTag.replace(">", ` ${HTMLElement.Attributes}>`);
    }
    const closingTag = `</${tagName}>`;

    const tagContent = HTMLElement?.Content || "";

    let codeViewText =
      tagName === commentTag
        ? tagContent
        : HTMLElement?.Contain === "None"
          ? openingTag
          : `${openingTag}${tagContent}${closingTag}`;

    const sortedUids = sortUidsAsc(selectedUids);
    if (sortedUids.length === 0) {
      toast.error("Please select a node to add the new element");
      return;
    }
    const uid = sortedUids[0];
    const node = validNodeTree[uid];
    let code = "";
    if (node) {
      if (node.displayName === "html" || node.displayName === "head") {
        toast.error("Adding not allowed");
        return;
      }

      let rangeEndColumn = node.data.sourceCodeLocation.endCol;
      let rangeEndLine = node.data.sourceCodeLocation.endLine;
      if (node.displayName === "body") {
        rangeEndColumn = node.data.sourceCodeLocation.startTag.endCol;
        rangeEndLine = node.data.sourceCodeLocation.startTag.endLine;
      }

      const text = `${codeViewText}`;
      codeViewText = await PrettyCode({ code: codeViewText });
      const edit = {
        range: new Range(
          rangeEndLine,
          rangeEndColumn,
          rangeEndLine,
          rangeEndColumn,
        ),
        text,
      };

      helperModel.applyEdits([edit]);

      if (!skipUpdate) {
        findNodeToSelectAfterAction({
          nodeUids: [uid],
          action: {
            type: "add",
            tagNames: [tagName],
          },
        });
        await dispatch(setIsContentProgrammaticallyChanged(true));
        setEditorModelValue(helperModel, codeViewInstanceModel);
      }
    }
  };

  const duplicate = async (params: Iduplicate = {}) => {
    if (!checkAllResourcesAvailable() || !codeViewInstanceModel) return;
    const { skipUpdate } = params;

    const helperModel = getEditorModelWithCurrentCode();

    const sortedUids = sortUidsDsc(selectedItems);
    for (let i = 0; i < sortedUids.length; i++) {
      const uid = sortedUids[i];
      const node = validNodeTree[uid];
      if (node) {
        const { startCol, startLine, endCol, endLine } =
          node.data.sourceCodeLocation;
        let text = codeViewInstanceModel.getValueInRange(
          new Range(startLine, startCol, endLine, endCol),
        );

        text = await PrettyCode({ code: text, startCol });
        const edit = {
          range: new Range(endLine, endCol, endLine, endCol),
          text,
        };
        helperModel.applyEdits([edit]);
      }
    }
    if (!skipUpdate) {
      await findNodeToSelectAfterAction({
        nodeUids: selectedNodeUids,
        action: {
          type: "add",
        },
      });
      await dispatch(setIsContentProgrammaticallyChanged(true));
      setEditorModelValue(helperModel, codeViewInstanceModel);
    }
  };

  //Read
  const getSelectedElements = () => {
    return selectedItems;
  };

  const getElement = (uid: string) => {
    return validNodeTree[uid];
  };

  const copy = async (params: Icopy = {}) => {
    const { uids, skipUpdate } = params;

    const selectedUids = uids || selectedItems;
    if (selectedUids.length === 0 || !codeViewInstanceModel) return;
    const sortedUids = sortUidsAsc(selectedUids);
    let copiedCode = "";

    sortedUids.forEach((uid) => {
      const node = validNodeTree[uid];
      if (node) {
        const { startLine, startCol, endLine, endCol } =
          node.data.sourceCodeLocation;
        const text =
          codeViewInstanceModel &&
          codeViewInstanceModel.getValueInRange(
            new Range(startLine, startCol, endLine, endCol),
          );
        copiedCode += text;
      }
    });

    if (!skipUpdate) {
      await window.navigator.clipboard.writeText(copiedCode);

      dispatch(
        setCopiedNodeDisplayName(
          selectedItems.map((uid) => validNodeTree[uid].displayName),
        ),
      );
    }
    return copiedCode;
  };

  const getElementSettings = (uid?: string) => {
    const focusedNode = validNodeTree[uid!] || validNodeTree[nFocusedItem];
    const { startTag } = focusedNode.data.sourceCodeLocation;
    if (!startTag) return {};
    const attributesKey = startTag.attrs ? Object.keys(startTag.attrs) : [];
    const existingAttributesObj: { [key: string]: string } = {};
    if (focusedNode.data.attribs) {
      attributesKey.forEach((key) => {
        existingAttributesObj[key] = focusedNode.data.attribs[key];
      });
    }
    return existingAttributesObj;
  };

  //Update
  const cut = async () => {
    if (!checkAllResourcesAvailable || !codeViewInstanceModel) return;

    const helperModel = getEditorModelWithCurrentCode();

    const { copiedCode, sortedUids } = await copyAndCutNode({
      textModel: helperModel,
      sortDsc: true,
    });

    dispatch(
      setCopiedNodeDisplayName(
        selectedItems.map((uid) => validNodeTree[uid].displayName),
      ),
    );

    setEditorModelValue(helperModel, codeViewInstanceModel);
    return {
      copiedCode,
      sortedUids,
    };
  };

  const paste = async (params: Ipaste = {}) => {
    const {
      textModel,
      skipUpdate,
      pastePosition = "after",
      targetNode,
      pasteContent,
    } = params;

    if (!codeViewInstanceModel) return;

    /* if targetUid is not provided, then the focused node will be the target node */
    const focusedNode = targetNode ? targetNode : validNodeTree[nFocusedItem];

    if (
      !focusedNode ||
      !focusedNode.data.sourceCodeLocation ||
      focusedNode?.parentUid === RootNodeUid
    ) {
      LogAllow &&
        console.error("Focused node or source code location is undefined");
      return;
    }
    if (!checkAllResourcesAvailable || !codeViewInstanceModel) return;

    const { isAllowed, selectedUids } = isPastingAllowed({
      selectedItems: [focusedNode.uid],
      nodeToAdd: copiedNodeDisplayName,
      checkFirstParents: !!pasteContent,
      isMove: !!pasteContent,
    });
    dispatch(setCopiedNodeDisplayName([]));
    const targetUid = selectedUids[0];
    if (!isAllowed && !pasteContent) {
      toast("Pasting not allowed", { type: "error" });
      return;
    }

    const helperModel = textModel || getEditorModelWithCurrentCode();

    let copiedCode =
      pasteContent || (await window.navigator.clipboard.readText());

    const { startLine, startCol, endLine, endCol } =
      validNodeTree[targetUid].data.sourceCodeLocation;

    /* can be used to paste the copied code before the focused node */
    let editRange;
    if (pastePosition === "before") {
      editRange = new Range(startLine, startCol, startLine, startCol);
    } else if (pastePosition === "after") {
      editRange = new Range(endLine, endCol, endLine, endCol);
    } else {
      const { startTag } = validNodeTree[targetUid].data.sourceCodeLocation;

      editRange = new Range(
        startTag.endLine,
        startTag.endCol,
        startTag.endLine,
        startTag.endCol,
      );
    }
    copiedCode = await PrettyCode({
      code: copiedCode,
      startCol: editRange.startColumn,
    });
    let code = copiedCode;
    const edit = {
      range: editRange,
      text: code,
    };
    helperModel.applyEdits([edit]);

    if (!skipUpdate) {
      const stringToHtml = parse5.parseFragment(copiedCode);

      const tagNames = stringToHtml.childNodes
        .filter((node) => {
          //@ts-expect-error - node.nodeName is not a string
          if (isValidNode(node)) {
            return true;
          }
        })
        .map((node) => node.nodeName.toLowerCase());
      await findNodeToSelectAfterAction({
        nodeUids: [targetUid],
        action: {
          type: "add",
          tagNames,
        },
      });
      setEditorModelValue(helperModel, codeViewInstanceModel);
    }
  };

  const plainPaste = () => {};

  const group = async (params: Igroup = {}) => {
    if (!checkAllResourcesAvailable() || !codeViewInstanceModel) return;
    const { skipUpdate } = params;

    const helperModel = getEditorModelWithCurrentCode();
    const sortedUids = sortUidsAsc(selectedItems);
    if (sortedUids.length === 0) return;

    const { isAllowed } = isPastingAllowed({
      selectedItems: [sortedUids[0]],
      nodeToAdd: ["div"],
      checkFirstParents: true,
    });
    if (!isAllowed) {
      toast("Grouping not allowed", { type: "error" });
      return;
    }

    const copiedCode = await copy();

    const { startLine, startCol } =
      validNodeTree[sortedUids[0]].data.sourceCodeLocation;

    await remove({
      textModel: helperModel,
      skipUpdate: true,
    });

    let code = `<div>${copiedCode}</div>`;
    code = await PrettyCode({ code, startCol });

    const edit = {
      range: new Range(startLine, startCol, startLine, startCol),
      text: code,
    };

    findNodeToSelectAfterAction({
      nodeUids: [sortedUids[0]],
      action: {
        type: "replace",
        tagNames: ["div"],
      },
    });

    helperModel.applyEdits([edit]);
    if (!skipUpdate) {
      setEditorModelValue(helperModel, codeViewInstanceModel);
    }
  };

  const ungroup = async (params: Iungroup = {}) => {
    if (!checkAllResourcesAvailable() || !codeViewInstanceModel) return;

    const { skipUpdate } = params;
    const helperModel = getEditorModelWithCurrentCode();

    const sortedUids = sortUidsAsc(selectedItems);

    const allNodePathsToSelect: string[] = [];
    for (let i = 0; i < sortedUids.length; i++) {
      const uid = sortedUids[i];
      const node = validNodeTree[uid];

      const children = node?.children;

      if (!children) return;
      let copiedCode = "";
      if (children.length === 0) {
        const { startTag, endTag } = node.data.sourceCodeLocation;
        copiedCode = codeViewInstanceModel.getValueInRange(
          new Range(
            startTag.endLine,
            startTag.endCol,
            endTag.startLine,
            endTag.startCol,
          ),
        );
        if (!copiedCode) return;
      }

      const { startLine, startCol, endLine, endCol } =
        node.data.sourceCodeLocation;

      children.forEach((uid) => {
        const node = validNodeTree[uid];
        if (node) {
          const { startLine, startCol, endLine, endCol } =
            node.data.sourceCodeLocation;
          const text = codeViewInstanceModel.getValueInRange(
            new Range(startLine, startCol, endLine, endCol),
          );
          copiedCode += text;
        }
      });

      const removeGroupedCodeEdit = {
        range: new Range(startLine, startCol, endLine, endCol),
        text: "",
      };

      const prettyCopiedCode = await PrettyCode({ code: copiedCode, startCol });
      const addUngroupedCodeEdit = {
        range: new Range(startLine, startCol, startLine, startCol),
        text: prettyCopiedCode,
      };

      const stringToHtml = parse5.parseFragment(prettyCopiedCode);

      const tagNames = stringToHtml.childNodes
        .filter((node) => {
          //@ts-expect-error - node.nodeName is not a string
          if (isValidNode(node)) {
            return true;
          }
        })
        .map((node) => node.nodeName.toLowerCase());
      const nodesPathToSelect = await findNodeToSelectAfterAction({
        nodeUids: [uid],
        action: {
          type: "replace",
          tagNames,
        },
      });
      if (nodesPathToSelect) {
        allNodePathsToSelect.push(...nodesPathToSelect);
      }
      helperModel.applyEdits([removeGroupedCodeEdit, addUngroupedCodeEdit]);
    }
    if (!skipUpdate) {
      setEditorModelValue(helperModel, codeViewInstanceModel);
      dispatch(setNeedToSelectNodePaths(allNodePathsToSelect));
    }
  };

  const move = async (params: Imove) => {
    if (!codeViewInstanceModel) return;
    /*
    isBetween is false when we drop on a parent node and is true when we drop inside a parent node which has children
    isBetween is true even if we drop on the first child of the parent node
    */

    const { targetUid, isBetween, position, selectedUids } = params;

    const { isAllowed } = isPastingAllowed({
      selectedItems: [targetUid],
      nodeToAdd: selectedUids.map((uid) => validNodeTree[uid]?.displayName),
      isMove: true,
      checkFirstParents: true,
    });
    if (!isAllowed) {
      toast("Pasting not allowed", { type: "error" });
      return;
    }

    const targetNode = validNodeTree[targetUid];

    const helperModel = getEditorModelWithCurrentCode();

    // When the position is 0 we need to add inside the target node
    const focusedItem =
      isBetween && position === 0
        ? targetNode.uid
        : targetNode.children[position - 1]
          ? targetNode.children[position - 1]
          : targetNode.uid;

    const copiedCode = await copy({
      uids: selectedUids,
      skipUpdate: true,
    });

    const sortedUids = sortUidsDsc(Array.from([...selectedUids, focusedItem]));

    let focusedNodeIndexInSortedUids = 0;
    for (let i = 0; i < sortedUids.length; i++) {
      const uid = sortedUids[i];
      const node = validNodeTree[uid];
      if (node) {
        const { startLine, startCol, endLine, endCol } =
          node.data.sourceCodeLocation;
        const range = new Range(startLine, startCol, endLine, endCol);
        if (copiedCode && uid === focusedItem) {
          const pastePosition =
            focusedItem === targetNode.uid ? "inside" : "after";

          await paste({
            textModel: helperModel,
            pasteContent: copiedCode,
            pastePosition,
            targetNode: validNodeTree[focusedItem],
            skipUpdate: true,
          });
          focusedNodeIndexInSortedUids = i;
        } else {
          const edit = {
            range,
            text: "",
          };
          helperModel.applyEdits([edit]);
        }
      }
    }

    setEditorModelValue(helperModel, codeViewInstanceModel);

    const targetPath = validNodeTree[focusedItem].uniqueNodePath;
    let movedNodePaths = sortedUids
      .slice(focusedNodeIndexInSortedUids + 1)
      .map((uid) => validNodeTree[uid].uniqueNodePath) as string[];

    //make sure the movedNodePaths are unique and not undefined
    movedNodePaths = Array.from(new Set(movedNodePaths)).filter(
      (path) => typeof path === "string",
    );
    if (!targetPath) return;

    //we initialize the updatedTargetNodePath with the targetPath
    let updatedTargetNodePath = targetPath;

    let pathSubtractor = 1;
    let prevCommonPath = "";
    /*Example:
     Target Node Path: ROOT.html_1.body_2.div_1.div_1.div_9.div_2.div_1
     Moved Node Path: ROOT.html_1.body_2.div_1.div_1.h2_4
     */
    movedNodePaths.forEach((path) => {
      const movedPathArr = path.split(".");
      //[ROOT,html_1,body_2,div_1,div_1, div_9, div_2, div_1]
      const targetPathArr = updatedTargetNodePath.split(".");
      //[ROOT,html_1,body_2,div_1,div_1,h2_4]
      const movedPathLength = movedPathArr.length;
      const targetPathLength = targetPathArr.length;

      /* We find minimum path length so that 
      we only find the common path*/

      const minPathLength = Math.min(movedPathLength, targetPathLength);
      let commonPath = "";
      //ROOT.html_1.body_2.div_1.div_1

      /*we are trying to find the common path between the moved node 
      and the target node to find the divergent node */
      for (let i = 0; i < minPathLength; i++) {
        /* till the paths are the same 
        we keep adding the path to the common path */
        if (movedPathArr[i] === targetPathArr[i]) {
          commonPath += `${movedPathArr[i]}.`;
        } else {
          /* Divergent nodes are the nodes where 
          both target and moved nodes are siblings */
          const divergentMovedNode = movedPathArr[i];
          const divergentTargetNode = targetPathArr[i];

          /* We need to check if the diverged moved node is 
          before the diverged target node*/
          const divergentMovedNodeIndex = parseInt(
            divergentMovedNode.split("_")[1],
          );
          let divergentTargetNodeIndex = parseInt(
            divergentTargetNode.split("_")[1],
          );

          /* If the diverged moved node is before the diverged target node
          we need to subtract the pathSubtractor from the diverged target node index */
          if (divergentMovedNodeIndex < divergentTargetNodeIndex) {
            let remainingPath = "";
            //.div_2.div_1

            /*When the diverged target node is not the last node*/
            if (i + 1 < targetPathLength) {
              remainingPath = `.${targetPathArr.slice(i + 1).join(".")}`;
            }
            if (prevCommonPath !== commonPath) {
              pathSubtractor = 1;
            } else {
              prevCommonPath = commonPath;
              pathSubtractor++;
            }

            /* We update the diverged target node index by 
            subtracting the pathSubtractor which is always 1 
            if we are moving only 1 node */
            divergentTargetNodeIndex -= pathSubtractor;

            /* construct the uncommon path with updated divergent target node index */
            const updatedDivergentNode = `${divergentTargetNode.split("_")[0]}_${divergentTargetNodeIndex}${remainingPath}`;

            /* update the target node path with the updated divergent node */
            updatedTargetNodePath = `${commonPath}${updatedDivergentNode}`;
          }

          break;
        }
      }
    });

    //get selecteduids nodes name
    const movedNodeNames = selectedUids.map(
      (uid) => validNodeTree[uid].displayName,
    );

    //get index of the updatedTargetNodePath
    const updatedTargetNodePathArr = updatedTargetNodePath.split("_");
    const updatedTargetNodeIndex = parseInt(
      updatedTargetNodePathArr[updatedTargetNodePathArr.length - 1],
    );

    const targetNodePathArr = updatedTargetNodePath.split(".");
    const targetNodeParentPath = targetNodePathArr.slice(0, -1).join(".");

    const indexOffset = position === 0 ? 0 : updatedTargetNodeIndex;
    const finalTargetPath =
      position === 0 || pathSubtractor > 1
        ? updatedTargetNodePath
        : targetNodeParentPath;
    const nodePathsToFocus = movedNodeNames.map((name, index) => {
      const targetNodeIndex = indexOffset + index + 1;
      return `${finalTargetPath}.${name}_${targetNodeIndex}`;
    });

    dispatch(setNeedToSelectNodePaths(nodePathsToFocus));
  };

  const updateEditableElement = useCallback(
    async (params: IupdateEditableElement) => {
      const { eventListenerRef, contentEditableUid, eventSource } = params;
      const helperModel = getEditorModelWithCurrentCode();
      const iframeRef = eventListenerRef.current.iframeRefRef.current;
      const nodeTree = eventListenerRef.current.nodeTreeRef.current;
      const codeViewInstanceModel = monacoEditorRef.current?.getModel();
      if (!codeViewInstanceModel || !iframeRef) return;

      const contentEditableElement =
        iframeRef.contentWindow?.document.querySelector(
          `[${StageNodeIdAttr}="${contentEditableUid}"]`,
        ) as HTMLElement;

      if (!contentEditableElement) return;

      contentEditableElement.setAttribute("contenteditable", "false");
      const content = contentEditableElement.innerHTML
        .replace(/\n/, "")
        .replace(
          /data-rnbw-stage-node-id="\d+"|rnbwdev-rnbw-element-(select|hover)=""/g,
          "",
        );

      const focusedNode = nodeTree[contentEditableUid];
      const { startTag, endTag, startLine, endLine, startCol, endCol } =
        focusedNode.data.sourceCodeLocation;
      if (startTag && endTag) {
        const edit = {
          range: new Range(
            startTag.endLine,
            startTag.endCol,
            endTag.startLine,
            endTag.startCol,
          ),
          text: content,
        };
        helperModel.applyEdits([edit]);
      } else if (startLine && endLine && startCol && endCol) {
        const edit = {
          range: new Range(startLine, startCol, endLine, endCol),
          text: content,
        };
        helperModel.applyEdits([edit]);
      }
      await dispatch(setIsContentProgrammaticallyChanged(true));
      setEditorModelValue(helperModel, codeViewInstanceModel);
      if (eventSource === "esc") {
        const uniqueNodePath = focusedNode.uniqueNodePath;
        uniqueNodePath && dispatch(setNeedToSelectNodePaths([uniqueNodePath]));
      }
    },
    [codeViewInstanceModel],
  );

  const updateSettings = async (params: IupdateSettings) => {
    if (!checkAllResourcesAvailable() || !codeViewInstanceModel) return;

    const { settings, skipUpdate } = params;
    const oldSettings = getElementSettings();
    const helperModel = getEditorModelWithCurrentCode();

    const focusedNode = validNodeTree[nFocusedItem];
    const attributesString = Object.entries(settings).reduce(
      (acc, [key, value]) => {
        const attributes = `${acc} ${key}="${value}"`;
        return attributes;
      },
      "",
    );
    const updatedTag = `<${focusedNode.displayName}${attributesString}>`;
    /* Don't prettify the code with prettyCode function 
    for updating the attributes as it automatically adds the closing tag */

    /* validating the attributes using PrettyCode function */
    let isInvalid = false;
    await PrettyCode({ code: updatedTag, throwError: true }).catch((e) => {
      LogAllow && console.error("Error in pretty code", e);
      if (e.stack.includes("SyntaxError")) {
        isInvalid = true;
        toast.error("Invalid settings value");
      }
    });
    if (isInvalid) return { isSuccess: false, settings: oldSettings };

    const { startTag } = focusedNode.data.sourceCodeLocation;
    const range = new Range(
      startTag.startLine,
      startTag.startCol,
      startTag.endLine,
      startTag.endCol,
    );
    const edit = {
      range,
      text: updatedTag,
    };
    helperModel.applyEdits([edit]);
    if (!skipUpdate) {
      await findNodeToSelectAfterAction({
        nodeUids: [nFocusedItem],
        action: {
          type: "replace",
        },
      });
      await dispatch(setIsContentProgrammaticallyChanged(true));
      setEditorModelValue(helperModel, codeViewInstanceModel);
    }

    return { isSuccess: true, settings };
  };

  const undo = () => {
    if (nodeEventPastLength <= 2) {
      LogAllow && console.log("Undo - NodeTree - it is the origin state");
      return;
    }
    if (
      currentFileContent !==
        nodeEventPast[nodeEventPastLength - 1].currentFileContent &&
      selectedNodeUids.join("") ===
        nodeEventPast[nodeEventPastLength - 1].selectedNodeUids.join("")
    ) {
      dispatch({ type: NodeTree_Event_UndoActionType });
      dispatch({ type: NodeTree_Event_UndoActionType });
    } else {
      dispatch({ type: NodeTree_Event_UndoActionType });
    }
    dispatch(setIsContentProgrammaticallyChanged(true));
    dispatch(setDidUndo(true));
  };

  const redo = () => {
    if (nodeEventFutureLength === 0) {
      LogAllow && console.log("Redo - NodeTree - it is the latest state");
      return;
    }

    dispatch({ type: NodeTree_Event_RedoActionType });
    dispatch(setDidRedo(true));
    dispatch(setIsContentProgrammaticallyChanged(true));
  };

  const setSelectedElements = (uids: string[]) => {
    dispatch(setSelectedNodeUids(uids));
  };

  //Delete
  const remove = async (params: Iremove = {}) => {
    const { uids, skipUpdate, textModel } = params;
    const removalUids = uids || selectedItems;

    if (removalUids.length === 0 || !codeViewInstanceModel) return;
    /* The user should not be able to delete the html, head, and body tags. */
    if (
      removalUids.some((uid) =>
        ["html", "head", "body"].includes(validNodeTree[uid].displayName),
      )
    ) {
      LogAllow && console.error("Deleting nodes not allowed");
      return;
    }

    const helperModel = textModel || getEditorModelWithCurrentCode();

    const sortedUids = sortUidsDsc(removalUids);

    sortedUids.forEach((uid) => {
      const node = validNodeTree[uid];
      if (node) {
        const { startCol, startLine, endCol, endLine } =
          node.data.sourceCodeLocation;
        const edit = {
          range: new Range(startLine, startCol, endLine, endCol),
          text: "",
        };
        helperModel.applyEdits([edit]);
      }
    });

    const code = helperModel.getValue();

    if (!skipUpdate) {
      await findNodeToSelectAfterAction({
        nodeUids: [removalUids[0]],
        action: {
          type: "remove",
        },
      });
      await dispatch(setIsContentProgrammaticallyChanged(true));
      if (helperModel !== textModel) {
        setEditorModelValue(helperModel, codeViewInstanceModel);
      }
    }
  };
  return {
    getElement,
    getElementSettings,
    add,
    duplicate,
    getSelectedElements,
    copy,
    setSelectedElements,
    cut,
    paste,
    plainPaste,
    group,
    ungroup,
    move,
    updateEditableElement,
    updateSettings,
    undo,
    redo,
    remove,
  };
}
