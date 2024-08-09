import * as prettier from "prettier/standalone";
import * as htmlParser from "prettier/plugins/html";
import * as parse5 from "parse5";
import { Range, editor } from "monaco-editor";
import { useAppState } from "@_redux/useAppState";
import { useContext, useMemo } from "react";
import { MainContext } from "@_redux/main";
import { elementsCmdk, getObjKeys } from "@src/helper";
import { LogAllow, RainbowAppName } from "@src/rnbwTSX";

import { toast } from "react-toastify";
import {
  THtmlDomNode,
  THtmlNode,
  THtmlNodeAttribs,
  THtmlNodeTreeData,
  THtmlParserResponse,
} from "@_api/node";
import {
  DataSequencedUid,
  getDecorationUid,
  getUidDecorations,
  PARSING_ERROR_MESSAGES,
  StageNodeIdAttr,
  TNode,
  TNodePositionInfo,
  TNodeUid,
  TValidNodeUid,
  ValidStageNodeUid,
} from "@_api/index";
import { RootNodeUid } from "@src/rnbwTSX";
import { useDispatch } from "react-redux";
import {
  focusNodeTreeNode,
  selectNodeTreeNodes,
  setNeedToSelectNodePaths,
  setNeedToSelectNodeUids,
  setNodeUidPositions,
} from "@_redux/main/nodeTree";
import { TCmdkGroupData } from "@_types/main";

export async function PrettyCode({
  code,
  startCol = 0,
  throwError = false,
}: {
  code: string;
  startCol?: number;
  throwError?: boolean;
}) {
  try {
    let prettyCode = await prettier.format(code, {
      parser: "html",
      plugins: [htmlParser],
    });

    /*  When prettier receives the code, it formats it as independent code (as a separate file),
      and it does not take into account that you need to keep some initial tabs or spaces
      to make this code look formatted relative to the other code.
         
      The following code checks if the code starts with tabs/spaces and includes
      them in each line to make it consistent with the rest of the code.
      This code also checks for blank lines and removes them. 
      
      startCol - the position from which the line with the code begins. */

    if (startCol > 1) {
      const lines = prettyCode.split("\n");
      const nonEmptyLines = lines.filter((line) => !/^\s*$/.test(line));
      const spaces = " ".repeat(startCol - 1);

      const linesWithSpaces = nonEmptyLines.map((line, index) => {
        return index === 0 ? line : spaces + line;
      });

      prettyCode = linesWithSpaces.join("\n");
    }
    return prettyCode;
  } catch (e) {
    console.error(e);
    //@ts-expect-error - toast.error expects a string
    const msg = e?.message as string;
    if (msg) {
      if (throwError) {
        throw e;
      } else {
        toast.error(`Failed to format the code: ${msg.split(".")[0]}`);
      }
    }
    return code;
  }
}
export const isValidNode = (node: THtmlDomNode) => {
  return node.nodeName == "#documentType" || node.nodeName == "#text"
    ? !!node?.value?.replace(/[\n\s]/g, "").length
    : true;
};

export const useElementHelper = () => {
  const {
    nSelectedItemsObj,
    validNodeTree,
    needToSelectNodePaths,
    didRedo,
    didUndo,
    htmlReferenceData,
  } = useAppState();
  const { monacoEditorRef } = useContext(MainContext);
  const dispatch = useDispatch();
  const selectedItems = useMemo(
    () => getObjKeys(nSelectedItemsObj),
    [nSelectedItemsObj],
  );
  function getEditorModelWithCurrentCode() {
    /*The role of helperModel is to perform all the edit operations in it 
  without affecting the actual codeViewInstanceModel and then apply the changes 
  to the codeViewInstanceModel all at once.*/
    const codeViewInstanceModel = monacoEditorRef.current?.getModel();
    const helperModel = editor.createModel("", "html");
    codeViewInstanceModel &&
      setEditorModelValue(codeViewInstanceModel, helperModel);
    return helperModel;
  }
  function setEditorModelValue(
    sourceModel: editor.ITextModel,
    targetModel: editor.ITextModel,
  ) {
    if (sourceModel && targetModel) {
      const uidDecorations = getUidDecorations(sourceModel);
      targetModel.setValue(sourceModel.getValue());
      targetModel.deltaDecorations([], uidDecorations);
    }
  }
  function checkAllResourcesAvailable() {
    const codeViewInstanceModel = monacoEditorRef.current?.getModel();
    if (selectedItems.length === 0) return false;
    if (!codeViewInstanceModel) {
      LogAllow &&
        console.error(
          `Monaco Editor ${!codeViewInstanceModel ? "" : "Model"} is undefined`,
        );
      return false;
    }
    return true;
  }

  const sortUidsDsc = (uids: string[]) => {
    return Array.from(uids)
      .filter((uid) => validNodeTree[uid].data.sourceCodeLocation)
      .sort((a, b) => {
        const location1 = validNodeTree[a].data.sourceCodeLocation;
        const location2 = validNodeTree[b].data.sourceCodeLocation;
        if (location1.startLine !== location2.startLine) {
          return location2.startLine - location1.startLine;
        }
        return location2.startCol - location1.startCol;
      });
  };

  const sortUidsAsc = (uids: string[]) => {
    return Array.from(uids)
      .filter((uid) => validNodeTree[uid].data.sourceCodeLocation)
      .sort((a, b) => {
        const location1 = validNodeTree[b].data.sourceCodeLocation;
        const location2 = validNodeTree[a].data.sourceCodeLocation;
        if (location1.startLine !== location2.startLine) {
          return location2.startLine - location1.startLine;
        }
        return location2.startCol - location1.startCol;
      });
  };

  async function copyAndCutNode({
    selectedUids,
    textModel,
    pasteToClipboard = true,
    sortDsc = false,
  }: {
    selectedUids?: string[];
    textModel?: editor.ITextModel;
    pasteToClipboard?: boolean;
    sortDsc?: boolean;
  } = {}) {
    const codeViewInstanceModel = monacoEditorRef.current?.getModel();
    const selected = selectedUids || selectedItems;
    const helperModel = textModel || getEditorModelWithCurrentCode();

    /* We are sorting nodes from the max to the min because this way the nodes of max index 
    are deleted first and they do not affect the nodes with index 
    lower to them in terms of the source code location*/

    const sortedUids = sortDsc ? sortUidsDsc(selected) : sortUidsAsc(selected);
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

        // remove the copied code from the original code
        const edit = {
          range: new Range(startLine, startCol, endLine, endCol),
          text: "",
        };
        helperModel.applyEdits([edit]);
      }
    });
    copiedCode = await PrettyCode({ code: copiedCode });
    pasteToClipboard &&
      (await window.navigator.clipboard.writeText(copiedCode));

    if (helperModel !== textModel && codeViewInstanceModel) {
      setEditorModelValue(helperModel, codeViewInstanceModel);
    }

    return {
      sortedUids,
      copiedCode,
    };
  }

  const parseHtml = async (
    content: string,
    maxNodeUid: number | "ROOT" | null,
    currentNodeUiPositions: Map<TNodeUid, TNodePositionInfo>,
    callback?: (validNodeUid: TValidNodeUid) => void,
  ): Promise<THtmlParserResponse> => {
    const codeViewInstanceModel = monacoEditorRef.current?.getModel();
    const uidDecorations = getUidDecorations(codeViewInstanceModel);
    const nodeUidPositions = new Map<TNodeUid, TNodePositionInfo>();

    const htmlDom = parse5.parse(content, {
      scriptingEnabled: true,
      sourceCodeLocationInfo: true,
      onParseError: (err) => {
        console.error(err);

        if (
          Object.prototype.hasOwnProperty.call(PARSING_ERROR_MESSAGES, err.code)
        ) {
          toast(PARSING_ERROR_MESSAGES[err.code], {
            type: "warning",
            toastId: PARSING_ERROR_MESSAGES[err.code],
          });
        }
      },
    });

    const nodeTree: THtmlNodeTreeData = {};
    const selectedNodeUids: TNodeUid[] = [];
    (() => {
      nodeTree[RootNodeUid] = {
        uid: RootNodeUid,
        validUid: RootNodeUid,
        parentUid: null,

        displayName: RootNodeUid,

        isEntity: true,
        children: [],

        data: {
          childNodes: htmlDom.childNodes,

          valid: true,

          nodeName: "",
          tagName: "",
          textContent: "",

          attribs: {},

          sourceCodeLocation: {
            startLine: 0,
            startCol: 0,
            startOffset: 0,
            endLine: 0,
            endCol: 0,
            endOffset: 0,
          },
        },
        uniqueNodePath: RootNodeUid,
      };
      const seedNodes: THtmlNode[] = [nodeTree[RootNodeUid]];
      let _uid = typeof maxNodeUid === "number" ? maxNodeUid : 0;
      let _validUid = _uid;

      const getHtmlNodeAttribs = (
        uid: TNodeUid,
        attrs: { name: string; value: string }[],
      ): THtmlNodeAttribs => {
        const attribs: THtmlNodeAttribs = {
          [DataSequencedUid]: uid,
        };
        attrs.map((attr) => {
          attribs[attr.name] = attr.value;
        });
        return attribs;
      };

      const getUniqueNodePath = ({
        parentUid,
        node,
        nodeTree,
        index,
      }: {
        parentUid: TNodeUid;
        node: THtmlDomNode;
        nodeTree: THtmlNodeTreeData;
        index: number;
      }) => {
        const parent = nodeTree[parentUid];
        const parentPath = parent.uniqueNodePath;
        if (parentPath) {
          return `${parentPath}.${node.nodeName}_${index}`;
        }
        return `${node.nodeName}_${index}`;
      };
      const proceedWithNode = ({
        uid,
        validUid,
        parentUid,
        node,
        nodeTree,
        index,
      }: {
        uid: TNodeUid;
        validUid: TValidNodeUid;
        parentUid: TNodeUid;
        node: THtmlDomNode;
        nodeTree: THtmlNodeTreeData;
        index: number;
      }) => {
        const {
          startLine = 0,
          startCol = 0,
          startOffset = 0,
          endLine = 0,
          endCol = 0,
          endOffset = 0,
          startTag,
          endTag,
        } = node.sourceCodeLocation || {};

        nodeTree[parentUid].children.push(uid);
        nodeTree[parentUid].isEntity = false;
        const _isValidNode = isValidNode(node);
        const uniqueNodePath = _isValidNode
          ? getUniqueNodePath({ parentUid, node, nodeTree, index })
          : "";

        if (
          needToSelectNodePaths &&
          needToSelectNodePaths.includes(uniqueNodePath)
        ) {
          selectedNodeUids.push(uid);
        }

        nodeTree[uid] = {
          uid,
          validUid: _isValidNode ? validUid : null,
          parentUid: parentUid,

          displayName: node.nodeName,

          isEntity: true,
          children: [],
          uniqueNodePath,
          data: {
            childNodes: node.childNodes,
            valid: _isValidNode,

            nodeName: node.nodeName,
            tagName: node.tagName || "",
            textContent: node.value || "",

            attribs: getHtmlNodeAttribs(uid, node.attrs || []),

            sourceCodeLocation: {
              startLine,
              startCol,
              startOffset,
              endLine,
              endCol,
              endOffset,
              startTag,
              endTag,
            },
          },
        };
        if (!node.attrs) node.attrs = [];
        node.attrs.push({ name: StageNodeIdAttr, value: uid });
        _isValidNode &&
          validUid &&
          node.attrs.push({ name: ValidStageNodeUid, value: `${validUid}` });
        node.attrs.push({
          name: DataSequencedUid,
          value: nodeTree[uid].uniqueNodePath,
        });
      };

      while (seedNodes.length) {
        const node = seedNodes.shift() as THtmlNode;
        if (!node.data.childNodes) continue;

        let index = 0;
        node.data.childNodes.map((child: THtmlDomNode) => {
          const isNodeValid = isValidNode(child);
          let uid = null;
          let uidIndex = -1;

          if (isNodeValid && child.sourceCodeLocation) {
            const line = child.sourceCodeLocation.startLine;
            const col = child.sourceCodeLocation.startCol;
            const range = new Range(line, col, line, col + 1);

            // Check for existing decoration
            if (!(didUndo || didRedo)) {
              uidIndex = uidDecorations?.findIndex(
                (decoration) =>
                  decoration && decoration.range.equalsRange(range),
              );
            }
          }

          if (uidIndex > -1) {
            const decoration = uidDecorations[uidIndex];
            // Use the UID from the existing decoration
            uid = getDecorationUid(decoration);
            nodeUidPositions.set(uid, {
              decorationId: decoration.id,
              location: child.sourceCodeLocation,
            });
            // Only used once, speed next findIndex up
            delete uidDecorations[uidIndex];
          } else {
            // Check whether there is an existing position info that
            // does not yet have a decoration (due to undo/redo)
            if ((didUndo || didRedo) && child.sourceCodeLocation) {
              const location = child.sourceCodeLocation;
              for (const [key, value] of currentNodeUiPositions?.entries()) {
                if (
                  value.location.startLine === location.startLine &&
                  value.location.startCol === location.startCol &&
                  value.location.endLine === location.endLine &&
                  value.location.endCol === location.endCol
                ) {
                  uid = key;
                  break;
                }
              }
            }

            if (uid === null) {
              // Generate new UID if no existing decoration found
              uid = String(++_uid);
            }

            if (child.sourceCodeLocation) {
              nodeUidPositions.set(uid, {
                decorationId: null,
                location: child.sourceCodeLocation,
              });
            }
          }

          let validUid = null;
          if (isNodeValid) {
            validUid = parseInt(uid);
            index++;
          }
          validUid && callback && callback(validUid);

          if (child.nodeName === "title") {
            window.document.title =
              child?.childNodes?.[0]?.value ?? RainbowAppName;
          }

          proceedWithNode({
            validUid,
            uid,
            parentUid: node.uid,
            node: child,
            nodeTree,
            index,
          });
          seedNodes.push(nodeTree[uid]);
        });
      }
    })();

    const uids = Object.keys(nodeTree);
    uids.map((uid) => {
      const node = nodeTree[uid];
      delete node.data.childNodes;
    });

    const contentInApp = parse5.serialize(htmlDom);

    if (!(didRedo || didUndo)) {
      await dispatch(setNodeUidPositions(nodeUidPositions));
      await dispatch(setNeedToSelectNodeUids(selectedNodeUids));
      if (selectedNodeUids.length > 0) {
        await dispatch(focusNodeTreeNode(selectedNodeUids[0]));
        await dispatch(selectNodeTreeNodes(selectedNodeUids));
      } else {
        await dispatch(focusNodeTreeNode(selectedItems[0]));
        await dispatch(selectNodeTreeNodes(selectedItems));
      }
    }

    return {
      contentInApp,
      nodeTree,
      htmlDom,
      selectedNodeUids,
    };
  };

  const findNodeToSelectAfterAction = async ({
    nodeUids,
    action,
    skipUpdate,
  }: {
    nodeUids: string[];
    action: {
      type: "add" | "remove" | "replace";
      tagNames?: string[];
    };
    skipUpdate?: boolean;
  }) => {
    const uniqueNodePaths: string[] = [];
    if (nodeUids.length === 0) return [];

    const sortedUids = nodeUids;

    for (let i = 0; i < sortedUids.length; i++) {
      const nodeUid = sortedUids[i];
      if (!nodeUid) return;
      const node = validNodeTree[nodeUid];
      if (!node) return;
      const parentUid = node.parentUid;
      if (!parentUid) return;
      const parent = validNodeTree[parentUid];
      if (!parent) return;

      const selectedChildIndex = node?.uniqueNodePath?.split("_").pop();
      if (!selectedChildIndex) return;

      const allTags = action?.tagNames ?? [node.data.tagName];

      let offset = 0;
      let tempPath = node.uniqueNodePath;

      /*TODO: handle selection when #text node 
      is encountered as it is converted to span and the attributes are not added to it*/

      //Find the next node to select after the remove action
      if (action.type === "remove") {
        const childrens = parent.children;
        const totalChildren = childrens.length;
        /* if there are more nodes in the parent other than the one being removed,
          then there are 2 possibilities:
          1. The last child is the one being removed, then the prev child should be selected
          2. The child being removed is not the last child, then the next child should be selected
          */

        /* if there is only one child in the parent, then the next parent should be selected */
        const validNodeTreeKeys = Object.keys(validNodeTree);

        if (childrens.length > 1) {
          // last child unique node path
          const lastChildUid = childrens?.[totalChildren - 1];
          const currentChildIndexInValidNodeTree =
            validNodeTreeKeys.indexOf(nodeUid);
          const prevChildUid =
            validNodeTreeKeys[currentChildIndexInValidNodeTree - 1];
          const prevChild = validNodeTree?.[prevChildUid];

          const nextChildUid =
            validNodeTreeKeys[currentChildIndexInValidNodeTree + 1];
          const nextChild = validNodeTree?.[nextChildUid];
          if (lastChildUid === nodeUid) {
            tempPath = prevChild?.uniqueNodePath;
          } else {
            tempPath = `${parent.uniqueNodePath}.${nextChild?.data.tagName}_${parseInt(
              selectedChildIndex,
            )}`;
          }
        } else {
          const indexOfCurrentParentUid = validNodeTreeKeys.indexOf(parentUid);
          const nextParentUid = validNodeTreeKeys[indexOfCurrentParentUid + 1];

          if (nextParentUid) {
            const nextParent = validNodeTree[nextParentUid];
            if (nextParent) {
              tempPath = nextParent.uniqueNodePath;
            }
          }
        }

        if (tempPath) {
          dispatch(setNeedToSelectNodePaths([tempPath]));
        }

        return;
      } else {
        tempPath = parent.uniqueNodePath;
      }
      if (action.type !== "replace") {
        offset = 1;
      }
      allTags.forEach((tagName, index) => {
        const tag = tagName ?? node.data.tagName;
        const newNodeIndex = parseInt(selectedChildIndex) + offset + index;

        // The uniqueNodePath is used to focus on the newly added node
        const uniqueNodePathToFocus = `${tempPath ?? ""}.${tag}_${newNodeIndex}`;
        uniqueNodePaths.push(uniqueNodePathToFocus);
      });
    }
    if (uniqueNodePaths.length === 0 || skipUpdate) return;
    await dispatch(setNeedToSelectNodePaths(uniqueNodePaths));

    return uniqueNodePaths;
  };

  const addTextNodeToElements = (data: TCmdkGroupData) => {
    data["Elements"].push({
      Featured: false,
      Name: "text",
      Icon: "comment",
      Description: "text element",
      "Keyboard Shortcut": [
        {
          cmd: false,
          shift: false,
          alt: false,
          key: "",
          click: false,
        },
      ],
      Group: "",
      Context: `Node-<#text>`,
    });
  };

  const isAllElementPastingAllowed = ({
    uid,
    isMove,
  }: {
    uid: TNodeUid;
    isMove?: boolean;
  }) => {
    const targetNode = validNodeTree[uid];
    const parentTarget = targetNode.parentUid;
    if (!parentTarget) return;

    return (
      htmlReferenceData?.elements[
        isMove
          ? validNodeTree[uid]?.displayName
          : validNodeTree[parentTarget]?.displayName
      ]?.Contain === "All"
    );
  };

  const isPastingAllowed = ({
    selectedItems,
    nodeToAdd,
    checkFirstParents = false,
    isMove = false,
  }: {
    selectedItems: TNodeUid[];
    nodeToAdd: string[];
    checkFirstParents?: boolean;
    isMove?: boolean;
  }) => {
    const selectedUids = [...selectedItems];
    const selectedNodes = selectedItems.map((uid) => validNodeTree[uid]);

    if (nodeToAdd.length === 0)
      return {
        isAllowed: true,
        selectedUids,
      };

    const checkAddingAllowed = (uid: string) => {
      const data: TCmdkGroupData = {
        Files: [],
        Elements: [],
        Recent: [],
      };

      elementsCmdk({
        validNodeTree,
        nFocusedItem: uid,
        htmlReferenceData,
        data,
        groupName: "Add",
        isMove,
      });

      return nodeToAdd.every((node: string) => {
        if (node.split("-").length > 1) {
          return isAllElementPastingAllowed({
            uid,
            isMove,
          });
        } else {
          if (node === "#text") {
            const textNodeAllowed = isAllElementPastingAllowed({
              uid,
              isMove,
            });
            textNodeAllowed && addTextNodeToElements(data);
          }
          return Object.values(data["Elements"]).some(
            (obj) => obj["Context"] === `Node-<${node}>`,
          );
        }
      });
    };
    let skipPosition;

    const allowedArray = selectedNodes.map((selectedNode: TNode, i: number) => {
      let addingAllowed =
        (selectedNode.displayName == "body" &&
          selectedNode.children.length == 0) ||
        checkAddingAllowed(selectedNode.uid);
      skipPosition = !addingAllowed;

      if (
        !addingAllowed &&
        !checkFirstParents &&
        selectedNode?.parentUid &&
        selectedNode?.parentUid !== RootNodeUid
      ) {
        selectedUids[i] = selectedNode.parentUid;
        addingAllowed = checkAddingAllowed(selectedNode.parentUid);
      }
      return addingAllowed;
    });

    return {
      isAllowed: !allowedArray.includes(false),
      selectedUids,
      skipPosition,
    };
  };

  return {
    setEditorModelValue,
    getEditorModelWithCurrentCode,
    checkAllResourcesAvailable,
    copyAndCutNode,
    parseHtml,
    findNodeToSelectAfterAction,
    sortUidsDsc,
    sortUidsAsc,
    isPastingAllowed,
  };
};
