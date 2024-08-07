import { DraggingPosition, TreeItem, TreeItemIndex } from "react-complex-tree";

import { getValidNodeUids } from "@_api/helpers";
import { TNodeUid } from "@_api/types";
import { useAppState } from "@_redux/useAppState";

import { useNodeViewState } from "./useNodeViewState";
import useRnbw from "@_services/useRnbw";

export const useNodeTreeCallback = (
  isDragging: React.MutableRefObject<boolean>,
) => {
  const { validNodeTree, htmlReferenceData } = useAppState();
  const rnbw = useRnbw();

  const { cb_focusNode, cb_selectNode, cb_expandNode, cb_collapseNode } =
    useNodeViewState();

  const onSelectItems = (items: TreeItemIndex[]) => {
    cb_selectNode(items as TNodeUid[]);
  };
  const onFocusItem = () => {
    cb_focusNode();
  };
  const onExpandItem = (item: TreeItem) => {
    cb_expandNode(item.index as TNodeUid);
  };
  const onCollapseItem = (item: TreeItem) => {
    cb_collapseNode(item.index as TNodeUid);
  };

  const onDrop = (
    items: TreeItem[],
    target: DraggingPosition & {
      parentItem?: TreeItemIndex;
      targetItem?: TreeItemIndex;
    },
  ) => {
    const isBetween = target.targetType === "between-items";
    const targetUid = (
      target.targetType === "item" ? target.targetItem : target.parentItem
    ) as TNodeUid;
    const position = isBetween ? target.childIndex : 0;

    const validUids = getValidNodeUids(
      validNodeTree,
      items.map((item) => item.data.uid),
      targetUid,
      "html",
      htmlReferenceData,
    );
    if (validUids.length === 0) return;

    if (target.parentItem === "ROOT") return;

    rnbw.elements.move({
      selectedUids: validUids,
      targetUid,
      isBetween,
      position,
    });

    isDragging.current = false;
  };

  return {
    onSelectItems,
    onFocusItem,
    onExpandItem,
    onCollapseItem,
    onDrop,
  };
};
