import { NodeInAppAttribName } from "@_constants/main";
import { THtmlNodeData } from "@_node/html";
import { TNode, TNodeTreeData, TNodeUid } from "@_node/types";
import { TClipboardData } from "@_types/main";
import { buildHtmlFromNode } from "./buildHtmlFromNode";

export const cloneAndInsertNode = (
  node: TNode,
  addedUidMap: Map<TNodeUid, TNodeUid>,
  targetElement: any,
  refElement: any,
  clipboardData: TClipboardData,
) => {

  const buildHtmlFromClipboard = (clipboardData:TClipboardData) => {
    if (!clipboardData || !clipboardData.data || clipboardData.data.length === 0) {
      return ''; 
    }
  
    const rootNode = clipboardData.data[0];
  
    return buildHtmlFromNode(rootNode, clipboardData.prevNodeTree);
  }
  
  const ele: string = buildHtmlFromClipboard(clipboardData);
  
  const div = document.createElement("div");

  if (ele) {
    div.innerHTML = ele.trim();
  }

  const _ele = div;

  const newUid = addedUidMap.get(node.uid);
  if (newUid) {
    _ele.setAttribute(NodeInAppAttribName, newUid);
  }

  const childElementList = _ele.querySelectorAll("*");
  childElementList.forEach((childElement) => {
    const childUid = childElement.getAttribute(NodeInAppAttribName);
    if (childUid) {
      const newChildUid = addedUidMap.get(childUid);
      if (newChildUid) {
        childElement.setAttribute(NodeInAppAttribName, newChildUid);
      }
    }
  });

  targetElement?.insertBefore(_ele, refElement || null);
};
