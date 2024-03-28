import { editor } from "monaco-editor";

import {
  NodeActions,
  StageNodeIdAttr,
  TNodeTreeData,
  TNodeUid,
} from "@_node/index";
import { AnyAction, Dispatch } from "@reduxjs/toolkit";
import { setIsContentProgrammaticallyChanged } from "@_redux/main/reference";

export const getValidElementWithUid = (
  ele: HTMLElement,
): { uid: TNodeUid | null; element: HTMLElement } => {
  let validElement = ele;
  let uid: TNodeUid | null = validElement.getAttribute(StageNodeIdAttr);
  while (!uid) {
    const parentElement = validElement.parentElement;
    if (!parentElement) break;

    uid = parentElement.getAttribute(StageNodeIdAttr);
    validElement = parentElement;
  }
  return { uid, element: validElement };
};

export const markSelectedElements = (
  iframeRef: HTMLIFrameElement | null,
  uids: TNodeUid[],
  nodeTree: TNodeTreeData,
) => {
  uids.map((uid) => {
    // if it's a web component, should select its first child element
    let selectedElement = iframeRef?.contentWindow?.document?.querySelector(
      `[${StageNodeIdAttr}="${uid}"]`,
    );

    const isValid: null | string = selectedElement?.firstElementChild
      ? selectedElement?.firstElementChild.getAttribute(StageNodeIdAttr)
      : "";

    isValid === null
      ? (selectedElement = selectedElement?.firstElementChild)
      : null;
    selectedElement?.setAttribute("rnbwdev-rnbw-element-select", "");

    if (!selectedElement && nodeTree[uid]?.displayName === "#text") {
      const selectedElement = iframeRef?.contentWindow?.document?.querySelector(
        `[${StageNodeIdAttr}="${nodeTree[uid].parentUid}"]`,
      );
      selectedElement?.setAttribute("rnbwdev-rnbw-element-select", "");
    }
  });
};
export const unmarkSelectedElements = (
  iframeRef: HTMLIFrameElement | null,
  uids: TNodeUid[],
  nodeTree: TNodeTreeData,
) => {
  uids.map((uid) => {
    // if it's a web component, should select its first child element
    let selectedElement = iframeRef?.contentWindow?.document?.querySelector(
      `[${StageNodeIdAttr}="${uid}"]`,
    );
    const isValid: null | string = selectedElement?.firstElementChild
      ? selectedElement?.firstElementChild.getAttribute(StageNodeIdAttr)
      : "";
    isValid === null
      ? (selectedElement = selectedElement?.firstElementChild)
      : null;
    selectedElement?.removeAttribute("rnbwdev-rnbw-element-select");

    if (!selectedElement && nodeTree[uid]?.displayName === "#text") {
      const selectedElement = iframeRef?.contentWindow?.document?.querySelector(
        `[${StageNodeIdAttr}="${nodeTree[uid].parentUid}"]`,
      );
      selectedElement?.removeAttribute("rnbwdev-rnbw-element-select");
    }
  });
};

export const markHoverdElement = (
  iframeRef: HTMLIFrameElement | null,
  uid: TNodeUid,
) => {
  // if it's a web component, should select its first child element
  let selectedElement = iframeRef?.contentWindow?.document?.querySelector(
    `[${StageNodeIdAttr}="${uid}"]`,
  );
  const isValid: null | string = selectedElement?.firstElementChild
    ? selectedElement?.firstElementChild.getAttribute(StageNodeIdAttr)
    : "";
  isValid === null
    ? (selectedElement = selectedElement?.firstElementChild)
    : null;
  selectedElement?.setAttribute("rnbwdev-rnbw-element-hover", "");
};
export const unmarkHoverdElement = (
  iframeRef: HTMLIFrameElement | null,
  uid: TNodeUid,
) => {
  // if it's a web component, should select its first child element
  let selectedElement = iframeRef?.contentWindow?.document?.querySelector(
    `[${StageNodeIdAttr}="${uid}"]`,
  );
  const isValid: null | string = selectedElement?.firstElementChild
    ? selectedElement?.firstElementChild.getAttribute(StageNodeIdAttr)
    : "";
  isValid === null
    ? (selectedElement = selectedElement?.firstElementChild)
    : null;
  selectedElement?.removeAttribute("rnbwdev-rnbw-element-hover");
};

export const editHtmlContent = ({
  dispatch,
  iframeRef,
  nodeTree,
  contentEditableUid,
  codeViewInstanceModel,
  formatCode,
  cb,
}: {
  dispatch: Dispatch<AnyAction>;
  iframeRef: HTMLIFrameElement;
  nodeTree: TNodeTreeData;
  contentEditableUid: TNodeUid;
  codeViewInstanceModel: editor.ITextModel;
  formatCode: boolean;
  cb?: () => void;
}) => {
  const contentEditableElement =
    iframeRef.contentWindow?.document.querySelector(
      `[${StageNodeIdAttr}="${contentEditableUid}"]`,
    ) as HTMLElement;

  if (contentEditableElement) {
    contentEditableElement.setAttribute("contenteditable", "false");
    //the first \n is replaced by "" as the first line break that is by default added by the contenteditable
    const content = contentEditableElement.innerHTML
      .replace(/\n/, "")
      .replace(
        /data-rnbw-stage-node-id="\d+"|rnbwdev-rnbw-element-(select|hover)=""/g,
        "",
      );

    dispatch(setIsContentProgrammaticallyChanged(true));
    NodeActions.edit({
      nodeTree,
      targetUid: contentEditableUid,
      content: content ? content : "",
      codeViewInstanceModel,
      formatCode,
      fb: () => setIsContentProgrammaticallyChanged(false),
      cb,
    });
  }
};

export const selectAllText = (
  iframeRef: HTMLIFrameElement | null,
  ele: HTMLElement,
) => {
  const range = iframeRef?.contentWindow?.document.createRange();
  if (range) {
    range.selectNodeContents(ele);
    const selection = iframeRef?.contentWindow?.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
};

// -----------------------
export const openNewPage = (ele: HTMLElement) => {
  if (ele.tagName !== "A") return;

  const anchorElement = ele as HTMLAnchorElement;
  if (anchorElement.href) {
    window.open(anchorElement.href, "_blank", "noreferrer");
  }
};

export const areArraysEqual = (arr1: string[], arr2: string[]) => {
  let same = false;
  if (arr1.length === arr2.length) {
    same = true;
    for (let index = 0, len = arr1.length; index < len; ++index) {
      if (arr1[index] !== arr2[index]) {
        same = false;
        break;
      }
    }
  }
  return same;
};
export const getBodyChild = ({
  uids,
  nodeTree,
}: {
  uids: TNodeUid[];
  nodeTree: TNodeTreeData;
}) => {
  const bodyChildren = uids.map((currentUid) => {
    let current: string = currentUid;
    let parentUid = nodeTree[currentUid]?.parentUid;

    while (parentUid && nodeTree[parentUid]?.displayName !== "body") {
      current = parentUid;
      parentUid = nodeTree[parentUid]?.parentUid;
    }
    const rootIndex = nodeTree[current]?.children?.findIndex(
      (uid) => nodeTree[uid]?.displayName === "html",
    );

    if (rootIndex !== -1) {
      const htmlNode = nodeTree[nodeTree[current]?.children[rootIndex]];
      const bodyIndex = htmlNode?.children?.findIndex(
        (uid) => nodeTree[uid]?.displayName === "body",
      );
      if (bodyIndex !== -1) {
        current = htmlNode?.children[bodyIndex];
      }
    }

    return current;
  });

  return bodyChildren;
};

export const isSameParents = ({
  currentUid,
  nodeTree,
  selectedUid,
}: {
  currentUid: TNodeUid;
  nodeTree: TNodeTreeData;
  selectedUid: TNodeUid;
}) => {
  let current: string = currentUid;
  let parentUid = nodeTree[currentUid]?.parentUid;

  while (parentUid && parentUid !== nodeTree[selectedUid]?.parentUid) {
    current = parentUid;
    parentUid = nodeTree?.[parentUid]?.parentUid;
  }
  return parentUid == nodeTree[selectedUid]?.parentUid ? current : false;
};
export const isChild = ({
  currentUid,
  nodeTree,
  selectedUid,
}: {
  currentUid: TNodeUid;
  nodeTree: TNodeTreeData;
  selectedUid: TNodeUid;
}) => {
  let current: string = currentUid;
  let parentUid = nodeTree[currentUid]?.parentUid;

  while (parentUid && parentUid !== selectedUid) {
    current = parentUid;
    parentUid = nodeTree?.[parentUid]?.parentUid;
  }
  return parentUid == selectedUid ? current : false;
};
