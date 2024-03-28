import React, { useContext, useEffect, useMemo, useRef, useState } from "react";

import { useDispatch } from "react-redux";

import { LogAllow } from "@_constants/global";
import { PreserveRnbwNode } from "@_node/file/handlers/constants";
import { TNodeUid } from "@_node/types";
import { MainContext } from "@_redux/main";
import {
  setIframeLoading,
  setNeedToReloadIframe,
} from "@_redux/main/stageView";
import { useAppState } from "@_redux/useAppState";

import { jss, styles } from "./constants";
import { markSelectedElements } from "./helpers";
import { useCmdk, useMouseEvents, useSyncNode } from "./hooks";
import { setLoadingFalse, setLoadingTrue } from "@_redux/main/processor";
import { useZoom } from "./hooks/useZoom";

export const IFrame = () => {
  const dispatch = useDispatch();
  const {
    needToReloadIframe,
    iframeSrc,
    project,
    showActionsPanel,
    showCodeView,
    nodeTree,
    validNodeTree,
  } = useAppState();
  const { iframeRefRef, setIframeRefRef } = useContext(MainContext);
  const allPanelsClosedRef = useRef(!showActionsPanel && !showCodeView);

  const [iframeRefState, setIframeRefState] =
    useState<HTMLIFrameElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [document, setDocument] = useState<any>("");

  const contentEditableUidRef = useRef<TNodeUid>("");
  const isEditingRef = useRef(false);

  // hooks
  const { nodeTreeRef, hoveredItemRef, selectedItemsRef } =
    useSyncNode(iframeRefState);
  const { onKeyDown, onKeyUp } = useCmdk({
    iframeRefRef,
    nodeTreeRef,
    contentEditableUidRef,
    isEditingRef,
    hoveredItemRef,
    selectedItemsRef,
  });
  const { onMouseEnter, onMouseMove, onMouseLeave, onClick, onDblClick } =
    useMouseEvents({
      iframeRefRef,
      nodeTreeRef,
      selectedItemsRef,
      contentEditableUidRef,
      isEditingRef,
    });

  useEffect(() => {
    allPanelsClosedRef.current = !showActionsPanel && !showCodeView;
  }, [showActionsPanel, showCodeView]);
  // init iframe
  useEffect(() => {
    setIframeRefRef(iframeRefState);
    if (iframeRefState) {
      project.context === "local" && dispatch(setLoadingTrue());
      dispatch(setIframeLoading(true));

      iframeRefState.onload = () => {
        LogAllow && console.log("iframe loaded");

        const _document = iframeRefState?.contentWindow?.document;
        const htmlNode = _document?.documentElement;
        const headNode = _document?.head;
        setDocument(_document);
        if (htmlNode && headNode) {
          // enable cmdk
          htmlNode.addEventListener("keydown", (e: KeyboardEvent) => {
            onKeyDown(e, allPanelsClosedRef.current);
          });

          // add rnbw css
          const style = _document.createElement("style");
          style.textContent = styles;
          style.setAttribute(PreserveRnbwNode, "true");
          headNode.appendChild(style);

          // add image-validator js
          const js = _document.createElement("script");
          js.setAttribute("image-validator", "true");
          js.setAttribute(PreserveRnbwNode, "true");
          js.textContent = jss;
          headNode.appendChild(js);

          // define event handlers
          htmlNode.addEventListener("mouseenter", () => {
            onMouseEnter();
          });
          htmlNode.addEventListener("mousemove", (e: MouseEvent) => {
            onMouseMove(e);
          });
          htmlNode.addEventListener("mouseleave", () => {
            onMouseLeave();
          });

          htmlNode.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            onClick(e);
          });
          htmlNode.addEventListener("dblclick", (e: MouseEvent) => {
            e.preventDefault();
            onDblClick(e);
          });
          htmlNode.addEventListener("keyup", (e: KeyboardEvent) => {
            e.preventDefault();
            onKeyUp(e);
          });
          // disable contextmenu
          _document.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
          });
        }

        // mark selected elements on load
        markSelectedElements(
          iframeRefState,
          selectedItemsRef.current,
          nodeTree,
        );

        dispatch(setIframeLoading(false));
        project.context === "local" && dispatch(setLoadingFalse());
      };
    }
  }, [iframeRefState]);

  // zoom iframe
  useZoom(iframeRefState, isEditingRef);

  // reload iframe
  useEffect(() => {
    needToReloadIframe && dispatch(setNeedToReloadIframe(false));
  }, [needToReloadIframe]);

  useEffect(() => {
    if (iframeRefState && document) {
      const iframeDocument = document;

      if (iframeDocument) {
        const wrapTextNodes = (element: HTMLElement) => {
          const childNodes = element.childNodes;

          for (let i = 0; i < childNodes.length; i++) {
            const node = childNodes[i];

            if (node && node.nodeType === Node.TEXT_NODE) {
              if (!node?.nodeValue?.replace(/[\n\s]/g, "").length) continue;
              const span = iframeDocument.createElement("span");
              const text = iframeDocument.createTextNode(node.nodeValue || "");
              const uid = element.getAttribute("data-rnbw-stage-node-id");

              if (!uid) continue;
              const nodeChildren = validNodeTree[uid]?.children;

              const filterArr = nodeChildren?.filter(
                (uid) =>
                  validNodeTree[uid]?.data?.textContent == node.nodeValue,
              );

              span.appendChild(text);
              span.setAttribute("rnbw-text-element", "true");
              span.setAttribute(
                "data-rnbw-stage-node-id",
                `${filterArr?.length ? filterArr[0] : i}`,
              );

              node.parentNode && node.parentNode.replaceChild(span, node);
            } else if (node && node.nodeType === Node.ELEMENT_NODE) {
              wrapTextNodes(node as HTMLElement);
            }
          }
        };

        wrapTextNodes(iframeDocument.body);
      }
    }
  }, [iframeRefState, document, needToReloadIframe, validNodeTree]);

  return useMemo(() => {
    return (
      <>
        {iframeSrc && !needToReloadIframe && (
          <iframe
            ref={setIframeRefState}
            id={"iframeId"}
            src={iframeSrc}
            style={{
              background: "white",
              width: "100%",
              height: "100%",
            }}
          />
        )}
      </>
    );
  }, [iframeSrc, needToReloadIframe]);
};
