import { useCallback, useEffect, useRef } from "react";

import { ShortDelay } from "@_constants/main";
import { StageNodeIdAttr } from "@_node/file/handlers/constants";
import { TNodeTreeData, TNodeUid } from "@_node/types";
import { debounce, scrollToElement } from "@_pages/main/helper";
import { useAppState } from "@_redux/useAppState";

import {
  markHoverdElement,
  markSelectedElements,
  unmarkHoverdElement,
  unmarkSelectedElements,
} from "../helpers";

export const useSyncNode = (iframeRef: HTMLIFrameElement | null) => {
  const {
    nodeTree,
    nFocusedItem: focusedItem,
    nSelectedItems: selectedItems,
    hoveredNodeUid,
  } = useAppState();

  const nodeTreeRef = useRef<TNodeTreeData>(nodeTree);
  useEffect(() => {
    nodeTreeRef.current = structuredClone(nodeTree);
  }, [nodeTree]);

  // hoveredNodeUid -> stageView
  const hoveredItemRef = useRef<TNodeUid>(hoveredNodeUid);
  useEffect(() => {
    if (hoveredItemRef.current === hoveredNodeUid) return;

    unmarkHoverdElement(iframeRef, hoveredItemRef.current);
    markHoverdElement(iframeRef, hoveredNodeUid);
    hoveredItemRef.current = hoveredNodeUid;
  }, [hoveredNodeUid]);

  // focusedItem -> scrollTo
  const focusedItemRef = useRef<TNodeUid>(focusedItem);

  const debouncedScrollToElement = useCallback(
    debounce(scrollToElement, ShortDelay),
    [],
  );
  useEffect(() => {
    if (focusedItemRef.current === focusedItem) return;

    const focusedElement = iframeRef?.contentWindow?.document?.querySelector(
      `[${StageNodeIdAttr}="${focusedItem}"]`,
    );
    focusedElement && debouncedScrollToElement(focusedElement, "smooth");

    focusedItemRef.current = focusedItem;
  }, [focusedItem]);

  // selectedItems -> stageView
  const selectedItemsRef = useRef<TNodeUid[]>(selectedItems);
  useEffect(() => {
    // check if it's a new state
    if (selectedItemsRef.current.length === selectedItems.length) {
      let same = true;
      for (
        let index = 0, len = selectedItemsRef.current.length;
        index < len;
        ++index
      ) {
        if (selectedItemsRef.current[index] !== selectedItems[index]) {
          same = false;
          break;
        }
      }
      if (same) return;
    }

    unmarkSelectedElements(iframeRef, selectedItemsRef.current, nodeTree);
    markSelectedElements(iframeRef, selectedItems, nodeTree);
    selectedItemsRef.current = [...selectedItems];
  }, [selectedItems]);

  return { nodeTreeRef, hoveredItemRef, focusedItemRef, selectedItemsRef };
};
