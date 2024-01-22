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

export const IFrame = () => {
  const dispatch = useDispatch();
  const { needToReloadIframe, iframeSrc } = useAppState();
  const { iframeRefRef, setIframeRefRef, contentEditableUidRef } =
    useContext(MainContext);

  const [iframeRefState, setIframeRefState] =
    useState<HTMLIFrameElement | null>(null);

  const isEditingRef = useRef(false);
  const linkTagUidRef = useRef<TNodeUid>("");

  // hooks
  const { nodeTreeRef, focusedItemRef, selectedItemsRef } =
    useSyncNode(iframeRefState);
  const { onKeyDown } = useCmdk({
    iframeRefRef,
    nodeTreeRef,
    isEditingRef,
  });
  const { onMouseEnter, onMouseMove, onMouseLeave, onClick, onDblClick } =
    useMouseEvents({
      iframeRefRef,
      nodeTreeRef,
      focusedItemRef,
      selectedItemsRef,
      contentEditableUidRef,
      isEditingRef,
      linkTagUidRef,
    });

  // init iframe
  useEffect(() => {
    setIframeRefRef(iframeRefState);
    if (iframeRefState) {
      dispatch(setIframeLoading(true));

      iframeRefState.onload = () => {
        LogAllow && console.log("iframe loaded");

        const _document = iframeRefState?.contentWindow?.document;
        const htmlNode = _document?.documentElement;
        const headNode = _document?.head;

        if (htmlNode && headNode) {
          // enable cmdk
          htmlNode.addEventListener("keydown", onKeyDown);

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
          htmlNode.addEventListener("mouseenter", (e: MouseEvent) => {
            onMouseEnter(e);
          });
          htmlNode.addEventListener("mousemove", (e: MouseEvent) => {
            onMouseMove(e);
          });
          htmlNode.addEventListener("mouseleave", (e: MouseEvent) => {
            onMouseLeave(e);
          });

          htmlNode.addEventListener("click", (e: MouseEvent) => {
            e.preventDefault();
            onClick(e);
          });
          htmlNode.addEventListener("dblclick", (e: MouseEvent) => {
            e.preventDefault();
            onDblClick(e);
          });

          // disable contextmenu
          _document.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
          });
        }

        // mark selected elements on load
        markSelectedElements(iframeRefState, selectedItemsRef.current);

        dispatch(setIframeLoading(false));
      };
    }
  }, [iframeRefState]);

  // reload iframe
  useEffect(() => {
    needToReloadIframe && dispatch(setNeedToReloadIframe(false));
  }, [needToReloadIframe]);

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
              position: "absolute",
              width: "100%",
              height: "100vh",
            }}
          />
        )}
      </>
    );
  }, [iframeSrc, needToReloadIframe]);
};
