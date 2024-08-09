import "./rnbw.css";
import "@rnbws/renecss/dist/rene.min.css";
import "@rnbws/svg-icon.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as ReactDOMClient from "react-dom/client";
import { Provider, useDispatch } from "react-redux";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { Workbox } from "workbox-window";
import persistStore from "redux-persist/es/persistStore";
import { PersistGate } from "redux-persist/integration/react";

import configureStore from "@_redux/_root";
import { Loader, Notification } from "@src/components";
import { ActionsPanel, CodeView, DesignView } from "./rnbw";
import { isUnsavedProject } from "@_api/file";
import { MainContext } from "@_redux/main";
import { setCurrentCommand } from "@_redux/main/cmdk";
import { useAppState } from "@_redux/useAppState";

import { useCmdk, useHandlers, useInit, useReferneces } from "@src/hooks";
import Processor from "@src/processor";
import ResizablePanels from "@_components/ResizablePanels";
import { debounce } from "@src/helper";
import { CommandDialog } from "@src/commandMenu/CommandDialog";
import { TNodeUid, TValidNodeUid } from "@_api/index";

// Constants
export const RootNodeUid = "ROOT";
export const DefaultProjectPath = "/untitled";
export const StagePreviewPathPrefix = "rnbw-stage-preview-";
export const CodeViewSyncDelay = 100;
export const CodeViewSyncDelay_Long = 1 * 1000;
export const AutoSaveDelay = 5000;

export const ParsableFileTypes: { [fileType: string]: true } = {
  html: true,
  css: true,
  js: true,
  txt: true,
  json: true,
  md: true,
  xml: true,
  svg: true,
};

export const RenderableFileTypes: { [fileType: string]: true } = {
  html: true,
};

export const AddActionPrefix = "AddAction";
export const AddFileActionPrefix = `${AddActionPrefix}-File`;
export const TmpFileNodeUidWhenAddNew = "tmp:node:uid";
export const AddNodeActionPrefix = `${AddActionPrefix}-Node`;

export const RenameActionPrefix = "RenameAction";
export const RenameFileActionPrefix = `${RenameActionPrefix}-File`;
export const RenameNodeActionPrefix = `${RenameActionPrefix}-Node`;

export const DefaultTabSize = 2;
export const RecentProjectCount = 10;
export const ShortDelay = 50;
export const NodePathSplitter = "?";
export const FileChangeAlertMessage = `Your changes will be lost if you don't save them. Are you sure you want to continue without saving?`;

export const DargItemImage = new Image();
DargItemImage.src =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";

export const RainbowAppName = "rnbw";
export const LogAllow = true;

function MainPage() {
  const dispatch = useDispatch();
  const { currentFileUid, fileTree, autoSave, cmdkReferenceData } =
    useAppState();

  const { monacoEditorRef, setMonacoEditorRef, iframeRefRef, setIframeRefRef } =
    useReferneces();

  const { importProject, closeNavigator, reloadCurrentProject } = useHandlers();
  const { onNew, onUndo, onRedo, onClear, onJumpstart } = useCmdk({
    cmdkReferenceData,
    importProject,
  });
  useInit({ importProject, onNew });

  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const prevFocusedElement = React.useRef<HTMLElement | null>(
    window.document.activeElement as HTMLElement | null,
  );
  const maxNodeUidRef = React.useRef<TValidNodeUid>(0);
  const setMaxNodeUidRef = (maxNodeUid: TValidNodeUid) => {
    if (typeof maxNodeUid === "number") {
      if (maxNodeUid > (maxNodeUidRef.current as number)) {
        maxNodeUidRef.current = maxNodeUid;
      }
    }
  };

  const contentEditableUidRef = React.useRef<TNodeUid>("");
  const setContentEditableUidRef = (uid: TNodeUid) => {
    contentEditableUidRef.current = uid;
  };

  const INTERVAL_TIMER = 2000;

  useEffect(() => {
    window.onbeforeunload = isUnsavedProject(fileTree) ? () => "changed" : null;
    return () => {
      window.onbeforeunload = null;
    };
  }, [fileTree]);

  const debouncedCurrentProjectReload = useCallback(() => {
    debounce(reloadCurrentProject, CodeViewSyncDelay)();
  }, [fileTree, currentFileUid, autoSave]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      fileTree[currentFileUid]?.data?.changed
        ? autoSave && dispatch(setCurrentCommand({ action: "Save" }))
        : debouncedCurrentProjectReload();
    }
  }, [fileTree, currentFileUid, debouncedCurrentProjectReload, autoSave]);

  const handleBlurChange = useCallback(() => {
    if (
      !window.document.activeElement?.isEqualNode(prevFocusedElement.current)
    ) {
      return;
    }
    intervalRef.current = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !fileTree[currentFileUid]?.data?.changed
      ) {
        if (
          !window.document.activeElement?.isEqualNode(
            prevFocusedElement.current,
          )
        ) {
          intervalRef.current && clearInterval(intervalRef.current);
          return;
        }
        debouncedCurrentProjectReload();
      }
    }, INTERVAL_TIMER);
  }, [fileTree, currentFileUid, debouncedCurrentProjectReload]);

  const handleFocusChange = useCallback(() => {
    if (intervalRef.current) {
      prevFocusedElement.current = window.document.activeElement as HTMLElement;
      clearInterval(intervalRef.current);
    }
  }, []);

  const handleOnWheel = (event: WheelEvent) => {
    if (event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const addEventListeners = useCallback(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("wheel", handleOnWheel, { passive: false });
    window.addEventListener("blur", handleBlurChange);
    window.addEventListener("focus", handleFocusChange);
    const contentWindow = iframeRefRef.current?.contentWindow;
    if (contentWindow) {
      contentWindow.addEventListener("focus", handleFocusChange);
      contentWindow.addEventListener("blur", handleBlurChange);
    }
  }, [
    handleVisibilityChange,
    handleFocusChange,
    handleBlurChange,
    iframeRefRef,
  ]);

  const removeEventListeners = useCallback(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("wheel", handleOnWheel);
    window.removeEventListener("blur", handleBlurChange);
    window.removeEventListener("focus", handleFocusChange);
    const contentWindow = iframeRefRef.current?.contentWindow;
    if (contentWindow) {
      contentWindow.removeEventListener("focus", handleFocusChange);
      contentWindow.removeEventListener("blur", handleBlurChange);
    }
  }, [
    handleVisibilityChange,
    handleFocusChange,
    handleBlurChange,
    iframeRefRef,
  ]);

  useEffect(() => {
    addEventListeners();
    return () => {
      removeEventListeners();
    };
  }, [addEventListeners, removeEventListeners]);

  return (
    <>
      <MainContext.Provider
        value={{
          maxNodeUidRef,
          setMaxNodeUidRef,
          monacoEditorRef,
          setMonacoEditorRef,
          contentEditableUidRef,
          setContentEditableUidRef,
          iframeRefRef,
          setIframeRefRef,
          importProject,
          reloadCurrentProject,
          onUndo,
          onRedo,
        }}
      >
        <Processor></Processor>
        <div
          id="MainPage"
          className={"view background-primary"}
          style={{ display: "relative" }}
          onClick={closeNavigator}
        >
          <Loader />
          <ResizablePanels
            sidebarView={<ActionsPanel />}
            codeView={<CodeView />}
            designView={<DesignView />}
          />
          <Notification />
        </div>
        <CommandDialog onClear={onClear} onJumpstart={onJumpstart} />
      </MainContext.Provider>
    </>
  );
}

function App() {
  const [nohostReady, setNohostReady] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const wb = new Workbox("/nohost-sw.js?route=rnbw");
      wb.register().then(() => {
        setNohostReady(true);
        LogAllow && console.log("nohost ready");
      });
      window.location.href = "/#";
    }
  }, []);

  return useMemo(
    () => (
      <>
        {nohostReady && (
          <Router>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/:project/*" element={<MainPage />} />
            </Routes>
          </Router>
        )}
      </>
    ),
    [nohostReady],
  );
}

// configure store
const store = configureStore({});
const persistor = persistStore(store);

// render #root
const root = ReactDOMClient.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <App />
    </PersistGate>
  </Provider>,
);

export default App;
