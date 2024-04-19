import React, { useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";

import IFrame from "./iFrame";

import { setActivePanel } from "@_redux/main/processor";
import { useAppState } from "@_redux/useAppState";

export default function StageView() {
  const { showCodeView, activePanel } = useAppState();

  const dispatch = useDispatch();
  const onClick = useCallback(() => {
    activePanel !== "stage" && dispatch(setActivePanel("stage"));
  }, [activePanel]);
  return useMemo(() => {
    return (
      <>
        <div
          id="StageView"
          className={showCodeView ? "" : "view"}
          onClick={onClick}
          style={{ height: "100%" }}
        >
          <IFrame />
        </div>
      </>
    );
  }, []);
}
