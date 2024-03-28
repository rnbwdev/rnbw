import { html_beautify } from "js-beautify";
import { editor, Range } from "monaco-editor";

import {
  sortUidsByMaxEndIndex,
  sortUidsByMinStartIndex,
} from "@_components/main/actionsPanel/nodeTreeView/helpers";
import { LogAllow } from "@_constants/global";
import {
  AddNodeActionPrefix,
  NodePathSplitter,
  RenameNodeActionPrefix,
} from "@_constants/main";
import { getValidNodeTree } from "@_pages/main/processor/helpers";
import {
  setCopiedNodeDisplayName,
  setNeedToSelectNodePaths,
  setNodeTree,
  focusNodeTreeNode
} from "@_redux/main/nodeTree";
import { THtmlReferenceData } from "@_types/main";

import {
  getNodeChildIndex,
  TNodeReferenceData,
  TNodeTreeData,
  TNodeUid,
} from "../";
import {
  copyCode,
  pasteCode,
  pasteCodeInsideEmpty,
  replaceContent,
} from "./helpers";
import { Dispatch } from "react";
import { AnyAction } from "@reduxjs/toolkit";
import { fileHandlers } from "@_node/file/handlers"

const add = ({
  dispatch,
  actionName,
  referenceData,
  nodeTree,
  selectedItems,
  codeViewInstanceModel,
  formatCode,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  actionName: string;
  referenceData: TNodeReferenceData;
  nodeTree: TNodeTreeData;
  selectedItems: TNodeUid[];
  codeViewInstanceModel: editor.ITextModel;
  formatCode: boolean;
  fb?: () => void;
  cb?: () => void;
}) => {
  try {
    const commentTag = "!--...--";
    const tagName = actionName.slice(
      AddNodeActionPrefix.length + 2,
      actionName.length - 1,
    );
    const htmlReferenceData = referenceData as THtmlReferenceData;
    const HTMLElement =
      htmlReferenceData.elements[tagName === commentTag ? "comment" : tagName];

    let openingTag = HTMLElement?.Tag || "";
    if (HTMLElement?.Attributes) {
      openingTag = openingTag.replace(">", ` ${HTMLElement.Attributes}>`);
    }
    const closingTag = `</${tagName}>`;

    const tagContent = HTMLElement?.Content || "";

    const codeViewText =
      tagName === commentTag
        ? tagContent
        : HTMLElement?.Contain === "None"
          ? openingTag
          : `${openingTag}${tagContent}${closingTag}`;

    const sortedUids = sortUidsByMaxEndIndex(selectedItems, nodeTree);
    sortedUids.forEach((uid) => {
      const node = nodeTree[uid];
      if (node) {
        const { endCol, endLine } = node.data.sourceCodeLocation;

        const edit = {
          range: new Range(endLine, endCol, endLine, endCol),
          text: codeViewText,
        };
        codeViewInstanceModel.applyEdits([edit]);
      }
    });

    // predict needToSelectNodePaths
    const needToSelectNodePaths = (() => {
      const needToSelectNodePaths: string[] = [];
      const validNodeTree = getValidNodeTree(nodeTree);
      const sortedUids = sortUidsByMinStartIndex(selectedItems, validNodeTree);
      const addedChildCount: { [uid: TNodeUid]: number } = {};
      sortedUids.map((uid) => {
        const node = validNodeTree[uid];
        const parentNode = validNodeTree[node.parentUid as TNodeUid];
        const nodeChildeIndex = getNodeChildIndex(parentNode, node);

        addedChildCount[node.parentUid as TNodeUid] =
          (addedChildCount[node.parentUid as TNodeUid] || 0) + 1;
        const newNodePath = `${parentNode.data.path}${NodePathSplitter}${tagName}-${nodeChildeIndex + addedChildCount[node.parentUid as TNodeUid]}`;
        needToSelectNodePaths.push(newNodePath);
      });
      return needToSelectNodePaths;
    })();
    dispatch(setNeedToSelectNodePaths(needToSelectNodePaths));

    const code = formatCode
      ? html_beautify(codeViewInstanceModel.getValue())
      : codeViewInstanceModel.getValue();
    codeViewInstanceModel.setValue(code);

    cb && cb();
  } catch (err) {
    LogAllow && console.log(err);
    fb && fb();
  }
};
function remove({
  dispatch,
  nodeTree,
  selectedUids,
  codeViewInstanceModel,
  formatCode,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  nodeTree: TNodeTreeData;
  selectedUids: TNodeUid[];
  codeViewInstanceModel: editor.ITextModel;
  formatCode: boolean;
  fb?: () => void;
  cb?: () => void;
}) {
  try {
    const sortedUids = sortUidsByMaxEndIndex(selectedUids, nodeTree);
    sortedUids.forEach((uid) => {
      const node = nodeTree[uid];
      if (node) {
        const { startCol, startLine, endCol, endLine } =
          node.data.sourceCodeLocation;
        const edit = {
          range: new Range(startLine, startCol, endLine, endCol),
          text: "",
        };
        codeViewInstanceModel.applyEdits([edit]);
      }
    });

    dispatch(setNeedToSelectNodePaths([]));

    const code = formatCode
      ? html_beautify(codeViewInstanceModel.getValue())
      : codeViewInstanceModel.getValue();
    codeViewInstanceModel.setValue(code);

    cb && cb();
  } catch (err) {
    fb && fb();
    LogAllow && console.log(err);
  }
}

const cut = async ({
  dispatch,
  nodeTree,
  selectedUids,
  codeViewInstanceModel,
  formatCode,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  nodeTree: TNodeTreeData;
  selectedUids: TNodeUid[];
  codeViewInstanceModel: editor.ITextModel;
  formatCode: boolean;
  fb?: () => void;
  cb?: () => void;
}) => {
  try {
    await copy({ dispatch, nodeTree, selectedUids, codeViewInstanceModel });
    dispatch(
      setCopiedNodeDisplayName(
        selectedUids.map((uid) => `Node-<${nodeTree[uid].displayName}>`),
      ),
    );
    remove({
      dispatch,
      nodeTree,
      selectedUids: selectedUids,
      codeViewInstanceModel,
      formatCode,
    });

    // predict needToSelectNodePaths
    const needToSelectNodePaths = (() => {
      const needToSelectNodePaths: string[] = [];
      const validNodeTree = getValidNodeTree(nodeTree);
      const sortedUids = sortUidsByMinStartIndex(selectedUids, validNodeTree);
      const removedChildCount: { [uid: TNodeUid]: number } = {};
      sortedUids.map((uid) => {
        const node = validNodeTree[uid];
        const parentNode = validNodeTree[node.parentUid as TNodeUid];
        const grandParentNode = validNodeTree[parentNode.parentUid as TNodeUid];
        const parentNodeChildeIndex = getNodeChildIndex(
          grandParentNode,
          parentNode,
        );

        removedChildCount[parentNode.uid] =
          (removedChildCount[parentNode.uid] || 0) + 1;
        removedChildCount[grandParentNode.uid] =
          removedChildCount[grandParentNode.uid] || 0;
        const newNodePath = `${grandParentNode.data.path}${NodePathSplitter}${
          parentNode.data.tagName
        }-${parentNodeChildeIndex - removedChildCount[grandParentNode.uid]}`;
        needToSelectNodePaths.push(newNodePath);
      });
      return needToSelectNodePaths;
    })();
    dispatch(setNeedToSelectNodePaths(needToSelectNodePaths));

    const code = formatCode
      ? html_beautify(codeViewInstanceModel.getValue())
      : codeViewInstanceModel.getValue();

    codeViewInstanceModel.setValue(code);

    cb && cb();
  } catch (err) {
    LogAllow && console.log(err);
    fb && fb();
  }
};
const copy = async ({
  dispatch,
  nodeTree,
  selectedUids,
  codeViewInstanceModel,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  nodeTree: TNodeTreeData;
  selectedUids: TNodeUid[];
  codeViewInstanceModel: editor.ITextModel;
  fb?: () => void;
  cb?: () => void;
}) => {
  try {
    const sortedUids = sortUidsByMinStartIndex(selectedUids, nodeTree);
    const copiedCode = copyCode({
      nodeTree,
      uids: sortedUids,
      codeViewInstanceModel,
    });
    await window.navigator.clipboard.writeText(copiedCode);

    dispatch(
      setCopiedNodeDisplayName(
        selectedUids.map((uid) => `Node-<${nodeTree[uid].displayName}>`),
      ),
    );

    // predict needToSelectNodePaths
    const needToSelectNodePaths = (() => {
      const needToSelectNodePaths: string[] = [];
      const validNodeTree = getValidNodeTree(nodeTree);
      selectedUids.map((uid) => {
        const node = validNodeTree[uid];
        needToSelectNodePaths.push(node.data.path);
      });
      return needToSelectNodePaths;
    })();
    dispatch(setNeedToSelectNodePaths(needToSelectNodePaths));

    cb && cb();
  } catch (err) {
    LogAllow && console.error("Error writing to clipboard:", err);
    fb && fb();
  }
};
const paste = async ({
  dispatch,
  nodeTree,
  targetUid,
  codeViewInstanceModel,
  spanPaste,
  formatCode,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  nodeTree: TNodeTreeData;
  targetUid: TNodeUid;
  codeViewInstanceModel: editor.ITextModel;
  spanPaste?: boolean;
  formatCode: boolean;
  fb?: () => void;
  cb?: () => void;
}) => {
  try {
    let code = await window.navigator.clipboard.readText();
    if (spanPaste) code = `<span>${code}</span>`;
    pasteCode({
      nodeTree,
      focusedItem: targetUid,
      codeViewInstanceModel,
      code,
    });

    // predict needToSelectNodePaths
    const needToSelectNodePaths = (() => {
      const needToSelectNodePaths: string[] = [];
      const validNodeTree = getValidNodeTree(nodeTree);
      const focusedNode = validNodeTree[targetUid];
      const parentNode = validNodeTree[focusedNode.parentUid as TNodeUid];
      const focusedNodeChildIndex = getNodeChildIndex(parentNode, focusedNode);

      let addedChildCount = 0;
      const divElement = window.document.createElement("div");
      divElement.innerHTML = code;
      if (divElement.hasChildNodes()) {
        for (const childNode of divElement.childNodes) {
          const nodeName = childNode.nodeName;
          if (nodeName !== "#text") {
            const tagName = String(nodeName).toLowerCase();
            ++addedChildCount;
            const newNodePath = `${
              parentNode.data.path
            }${NodePathSplitter}${tagName}-${
              focusedNodeChildIndex + addedChildCount
            }`;
            needToSelectNodePaths.push(newNodePath);
          }
        }
      }
      divElement.remove();

      return needToSelectNodePaths;
    })();
    dispatch(setNeedToSelectNodePaths(needToSelectNodePaths));

    code = formatCode
      ? html_beautify(codeViewInstanceModel.getValue())
      : codeViewInstanceModel.getValue();
    codeViewInstanceModel.setValue(code);

    cb && cb();
  } catch (err) {
    LogAllow && console.error("Error reading from clipboard:", err);
    fb && fb();
  }
};
const duplicate = ({
  dispatch,
  nodeTree,
  selectedUids,
  codeViewInstanceModel,
  formatCode,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  nodeTree: TNodeTreeData;
  selectedUids: TNodeUid[];
  codeViewInstanceModel: editor.ITextModel;
  formatCode: boolean;
  fb?: () => void;
  cb?: () => void;
}) => {
  try {
    const sortedUids = sortUidsByMaxEndIndex(selectedUids, nodeTree);
    sortedUids.forEach((uid) => {
      const node = nodeTree[uid];
      if (node) {
        const { startCol, startLine, endCol, endLine } =
          node.data.sourceCodeLocation;
        const text = codeViewInstanceModel.getValueInRange(
          new Range(startLine, startCol, endLine, endCol),
        );
        const edit = {
          range: new Range(endLine, endCol, endLine, endCol),
          text,
        };
        codeViewInstanceModel.applyEdits([edit]);
      }
    });

    // predict needToSelectNodePaths
    const needToSelectNodePaths = (() => {
      const needToSelectNodePaths: string[] = [];
      const validNodeTree = getValidNodeTree(nodeTree);
      const sortedUids = sortUidsByMinStartIndex(selectedUids, validNodeTree);
      const addedChildCount: { [uid: TNodeUid]: number } = {};
      sortedUids.map((uid) => {
        const node = validNodeTree[uid];
        const parentNode = validNodeTree[node.parentUid as TNodeUid];
        const nodeChildeIndex = getNodeChildIndex(parentNode, node);

        addedChildCount[node.parentUid as TNodeUid] =
          (addedChildCount[node.parentUid as TNodeUid] || 0) + 1;
        const newNodePath = `${parentNode.data.path}${NodePathSplitter}${
          node.data.tagName
        }-${nodeChildeIndex + addedChildCount[node.parentUid as TNodeUid]}`;
        needToSelectNodePaths.push(newNodePath);
      });
      return needToSelectNodePaths;
    })();
    dispatch(setNeedToSelectNodePaths(needToSelectNodePaths));

    const code = formatCode
      ? html_beautify(codeViewInstanceModel.getValue())
      : codeViewInstanceModel.getValue();
    codeViewInstanceModel.setValue(code);

    cb && cb();
  } catch (err) {
    LogAllow && console.log(err);
    fb && fb();
  }
};

const move = ({
  dispatch,
  nodeTree,
  selectedUids,
  targetUid,
  isBetween,
  position,
  codeViewInstanceModel,
  formatCode,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  nodeTree: TNodeTreeData;
  selectedUids: TNodeUid[];
  targetUid: TNodeUid;
  isBetween: boolean;
  position: number;
  codeViewInstanceModel: editor.ITextModel;
  formatCode: boolean;
  fb?: () => void;
  cb?: () => void;
}) => {
  try {
    const targetNode = getValidNodeTree(nodeTree)[targetUid];
    const childCount = targetNode.children.length;

    const focusedItem = isBetween
      ? targetNode.children[Math.min(childCount - 1, position - 1)]
      : targetNode.children[0];
    const sortedUids = sortUidsByMaxEndIndex(
      [...selectedUids, focusedItem],
      nodeTree,
    );

    let code = copyCode({
      nodeTree,
      uids: selectedUids,
      codeViewInstanceModel,
    });

    let isFirst = true; // isFirst is used to when drop focusedItem to itself
    sortedUids.map((uid) => {
      if (uid === focusedItem && isFirst) {
        isFirst = false;
        focusedItem
          ? pasteCode({
              nodeTree,
              focusedItem,
              addToBefore: (isBetween && position === 0) || position === 0,
              codeViewInstanceModel,
              code,
            })
          : pasteCodeInsideEmpty({
              nodeTree,
              focusedItem: targetNode.uid,
              codeViewInstanceModel,
              code,
            });
      } else {
        remove({
          dispatch,
          nodeTree,
          selectedUids: [uid],
          codeViewInstanceModel,
          formatCode,
        });
      }
    });

    // predict needToSelectNodePaths
    const needToSelectNodePaths = (() => {
      const needToSelectNodePaths: string[] = [];
      const validNodeTree = getValidNodeTree(nodeTree);
      const targetNode = validNodeTree[targetUid];

      let directChildCount = 0;
      selectedUids.map((uid) => {
        const node = validNodeTree[uid];
        if (node.parentUid === targetUid) {
          const nodeChildeIndex = getNodeChildIndex(targetNode, node);
          isBetween
            ? nodeChildeIndex < position
              ? directChildCount++
              : null
            : 0;
        }
      });

      selectedUids.map((uid, index) => {
        const node = validNodeTree[uid];
        const newNodeChildIndex =
          (isBetween ? position : 0) - directChildCount + index;
        const newNodePath = `${targetNode.data.path}${NodePathSplitter}${node.data.tagName}-${newNodeChildIndex}`;
        needToSelectNodePaths.push(newNodePath);
      });
      return needToSelectNodePaths;
    })();
    dispatch(setNeedToSelectNodePaths(needToSelectNodePaths));

    code = formatCode
      ? html_beautify(codeViewInstanceModel.getValue())
      : codeViewInstanceModel.getValue();
    codeViewInstanceModel.setValue(code);

    cb && cb();
  } catch (err) {
    LogAllow && console.log(err);
    fb && fb();
  }
};

const rename = ({
  dispatch,
  actionName,
  referenceData,
  nodeTree,
  targetUid,
  codeViewInstanceModel,
  formatCode,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  actionName: string;
  referenceData: THtmlReferenceData;
  nodeTree: TNodeTreeData;
  targetUid: TNodeUid;
  codeViewInstanceModel: editor.ITextModel;
  formatCode: boolean;
  fb?: () => void;
  cb?: () => void;
}) => {
  try {
    const tagName = actionName.slice(
      RenameNodeActionPrefix.length + 2,
      actionName.length - 1,
    );
    const htmlReferenceData = referenceData as THtmlReferenceData;
    const HTMLElement = htmlReferenceData.elements[tagName];

    let openingTag = HTMLElement?.Tag;
    if (HTMLElement?.Attributes) {
      const tagArray = openingTag.split("");
      tagArray.splice(tagArray.length - 1, 0, ` ${HTMLElement?.Attributes}`);
      openingTag = tagArray.join("");
    }
    const closingTag = `</${tagName}>`;

    // **********************************************************
    // will replace with pureTagCode when we will not want to keep origianl innerHtml of the target node
    // **********************************************************
    // const tagContent = HTMLElement.Content ? HTMLElement.Content : "";
    // const pureTagCode =
    //   HTMLElement.Contain === "None"
    //     ? openingTag
    //     : `${openingTag}${tagContent}${closingTag}`;

    const focusedNode = nodeTree[targetUid];

    let code = copyCode({
      nodeTree,
      uids: focusedNode.children,
      codeViewInstanceModel,
    });
    const codeToAdd = `${openingTag}${code}${closingTag}`;
    remove({
      dispatch,
      nodeTree,
      selectedUids: [targetUid],
      codeViewInstanceModel,
      formatCode,
    });
    pasteCode({
      nodeTree,
      focusedItem: targetUid,
      addToBefore: true,
      codeViewInstanceModel,
      code: codeToAdd,
    });

    // predict needToSelectNodePaths
    const needToSelectNodePaths = (() => {
      const needToSelectNodePaths: string[] = [];
      const validNodeTree = getValidNodeTree(nodeTree);
      const focusedNode = validNodeTree[targetUid];
      const parentNode = validNodeTree[focusedNode.parentUid as TNodeUid];
      const focusedNodeChildIndex = getNodeChildIndex(parentNode, focusedNode);
      const newNodePath = `${parentNode.data.path}${NodePathSplitter}${tagName}-${focusedNodeChildIndex}`;
      needToSelectNodePaths.push(newNodePath);
      return needToSelectNodePaths;
    })();
    dispatch(setNeedToSelectNodePaths(needToSelectNodePaths));

    code = formatCode
      ? html_beautify(codeViewInstanceModel.getValue())
      : codeViewInstanceModel.getValue();
    codeViewInstanceModel.setValue(code);

    cb && cb();
  } catch (err) {
    LogAllow && console.log(err);
    fb && fb();
  }
};

const group = ({
  dispatch,
  nodeTree,
  selectedUids,
  codeViewInstanceModel,
  formatCode,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  nodeTree: TNodeTreeData;
  selectedUids: TNodeUid[];
  codeViewInstanceModel: editor.ITextModel;
  formatCode: boolean;
  fb?: () => void;
  cb?: () => void;
}) => {
  try {
    const sortedUids = sortUidsByMinStartIndex(selectedUids, nodeTree);
    let code = copyCode({
      nodeTree,
      uids: sortedUids,
      codeViewInstanceModel,
    });
    remove({
      dispatch,
      nodeTree,
      selectedUids: selectedUids,
      codeViewInstanceModel,
      formatCode,
    });

    const { startLine, startCol } =
      nodeTree[sortedUids[0]].data.sourceCodeLocation;
    const edit = {
      range: new Range(startLine, startCol, startLine, startCol),
      text: code,
    };
    codeViewInstanceModel.applyEdits([edit]);

    // predict needToSelectNodePaths
    const needToSelectNodePaths = (() => {
      const needToSelectNodePaths: string[] = [];
      const validNodeTree = getValidNodeTree(nodeTree);
      const sortedUids = sortUidsByMinStartIndex(selectedUids, validNodeTree);
      const targetNode = validNodeTree[sortedUids[0]];
      const targetParentNode = validNodeTree[targetNode.parentUid as TNodeUid];
      const targetNodeChildIndex = getNodeChildIndex(
        targetParentNode,
        targetNode,
      );
      const newNodeTagName = "div";
      const newNodePath = `${targetParentNode.data.path}${NodePathSplitter}${newNodeTagName}-${targetNodeChildIndex}`;
      needToSelectNodePaths.push(newNodePath);
      return needToSelectNodePaths;
    })();
    dispatch(setNeedToSelectNodePaths(needToSelectNodePaths));

    code = formatCode
      ? html_beautify(codeViewInstanceModel.getValue())
      : codeViewInstanceModel.getValue();
    codeViewInstanceModel.setValue(code);

    cb && cb();
  } catch (err) {
    LogAllow && console.log(err);
    fb && fb();
  }
};

const ungroup = ({
  dispatch,
  nodeTree,
  selectedUids,
  codeViewInstanceModel,
  formatCode,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  nodeTree: TNodeTreeData;
  selectedUids: TNodeUid[];
  codeViewInstanceModel: editor.ITextModel;
  formatCode: boolean;
  fb?: () => void;
  cb?: () => void;
}) => {
  try {
    const sortedUids = sortUidsByMaxEndIndex(selectedUids, nodeTree);
    sortedUids.map((uid) => {
      const node = nodeTree[uid];
      if (node.children.length === 0) return;

      const { startLine, startCol } = node.data.sourceCodeLocation;
      const code = copyCode({
        nodeTree,
        uids: node.children,
        codeViewInstanceModel,
      });
      remove({
        dispatch,
        nodeTree,
        selectedUids: [uid],
        codeViewInstanceModel,
        formatCode,
      });
      const edit = {
        range: new Range(startLine, startCol, startLine, startCol),
        text: code,
      };
      codeViewInstanceModel.applyEdits([edit]);
    });

    // predict needToSelectNodePaths
    const needToSelectNodePaths = (() => {
      const needToSelectNodePaths: string[] = [];
      const validNodeTree = getValidNodeTree(nodeTree);
      const sortedUids = sortUidsByMinStartIndex(selectedUids, validNodeTree);
      const addedChildCount: { [uid: TNodeUid]: number } = {};
      sortedUids.map((uid) => {
        const containerNode = validNodeTree[uid];
        const parentNode = validNodeTree[containerNode.parentUid as TNodeUid];
        const containerNodeChildIndex = getNodeChildIndex(
          parentNode,
          containerNode,
        );
        addedChildCount[parentNode.uid] = addedChildCount[parentNode.uid] || 0;
        containerNode.children.map((childUid, index) => {
          const childNode = validNodeTree[childUid];
          const newNodePath = `${parentNode.data.path}${NodePathSplitter}${
            childNode.data.tagName
          }-${
            addedChildCount[parentNode.uid] + containerNodeChildIndex + index
          }`;
          needToSelectNodePaths.push(newNodePath);
        });
        addedChildCount[parentNode.uid] += containerNode.children.length - 1;
      });
      return needToSelectNodePaths;
    })();
    dispatch(setNeedToSelectNodePaths(needToSelectNodePaths));

    const code = formatCode
      ? html_beautify(codeViewInstanceModel.getValue())
      : codeViewInstanceModel.getValue();
    codeViewInstanceModel.setValue(code);

    cb && cb();
  } catch (err) {
    LogAllow && console.log(err);
    fb && fb();
  }
};

const edit = ({
  dispatch,
  nodeTree,
  targetUid,
  content,
  codeViewInstanceModel,
  formatCode,
  fb,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  nodeTree: TNodeTreeData;
  targetUid: TNodeUid;
  content: string;
  codeViewInstanceModel: editor.ITextModel;
  formatCode: boolean;
  fb?: () => void;
  cb?: () => void;
}) => {
  try {
    replaceContent({
      nodeTree,
      focusedItem: targetUid,
      content,
      codeViewInstanceModel,
    });

    const code = formatCode
      ? html_beautify(codeViewInstanceModel.getValue())
      : codeViewInstanceModel.getValue();
    codeViewInstanceModel.setValue(code);

    dispatch(setNodeTree(reCalcSourceCodeLocation(code)));
    dispatch(focusNodeTreeNode(targetUid));
    
    cb && cb();
  } catch (err) {
    LogAllow && console.log(err);
    fb && fb();
  }
};

export const addAttr = ({
  attrName,
  attrValue,
  nodeTree,
  focusedItem,
  codeViewInstanceModel,
  cb,
  fb,
}: {
  attrName: string;
  attrValue: string;
  nodeTree: TNodeTreeData;
  focusedItem: TNodeUid;
  codeViewInstanceModel: editor.ITextModel;
  cb?: () => void;
  fb?: () => void;
}) => {
  try {
    const focusedNode = nodeTree[focusedItem];
    const { startTag } = focusedNode.data.sourceCodeLocation;

    const text = codeViewInstanceModel.getValueInRange(
      new Range(
        startTag.startLine,
        startTag.startCol,
        startTag.endLine,
        startTag.endCol - 1,
      ),
    );
    const attr = `${attrName}="${attrValue}"`;
    const pattern = new RegExp(`${attrName}="(.*?)"`, "g");
    const replace = pattern.test(text);
    const content = replace ? text.replace(pattern, attr) : ` ${attr}`;

    if (startTag) {
      const edit = {
        range: replace
          ? new Range(
              startTag.startLine,
              startTag.startCol,
              startTag.endLine,
              startTag.endCol - 1,
            )
          : new Range(
              startTag.endLine,
              startTag.endCol - 1,
              startTag.endLine,
              startTag.endCol - 1,
            ),
        text: content,
      };
      codeViewInstanceModel.applyEdits([edit]);
    }

    cb && cb();
  } catch (err) {
    LogAllow && console.log(err);
    fb && fb();
  }
};
export const removeAttr = ({
  attrName,
  attrValue,
  nodeTree,
  focusedItem,
  codeViewInstanceModel,
  cb,
  fb,
}: {
  attrName: string;
  attrValue?: string;
  nodeTree: TNodeTreeData;
  focusedItem: TNodeUid;
  codeViewInstanceModel: editor.ITextModel;
  cb?: () => void;
  fb?: () => void;
}) => {
  try {
    const focusedNode = nodeTree[focusedItem];
    const { startTag } = focusedNode.data.sourceCodeLocation;

    const text = codeViewInstanceModel.getValueInRange(
      new Range(
        startTag.startLine,
        startTag.startCol,
        startTag.endLine,
        startTag.endCol - 1,
      ),
    );

    const pattern = new RegExp(`${attrName}="${attrValue}"`, "g");
    const singleAttrPattern = new RegExp(`${attrName}`, "g");
    const content = pattern.test(text)
      ? text.replace(pattern, "")
      : text.replace(singleAttrPattern, "");

    if (startTag) {
      const edit = {
        range: new Range(
          startTag.startLine,
          startTag.startCol,
          startTag.endLine,
          startTag.endCol - 1,
        ),
        text: content,
      };
      codeViewInstanceModel.applyEdits([edit]);
    }

    cb && cb();
  } catch (err) {
    LogAllow && console.log(err);
    fb && fb();
  }
};
export const NodeActions = {
  add,
  remove,
  cut,
  copy,
  paste,
  duplicate,
  move,
  rename,
  group,
  ungroup,
  edit,
  addAttr,
  removeAttr,
};
export const reCalcSourceCodeLocation = (content:string) => {
  const htmlParser = fileHandlers['html'];
  const { nodeTree } = htmlParser(content);
  return nodeTree;
}
