import { eventListenersStatesRefType } from "@_components/main/stageView/iFrame/IFrame";
import { TNode, TNodeUid } from "@_node/index";

interface Iadd {
  tagName: string;
  attributes: string;
  skipUpdate?: boolean;
}

interface Iduplicate {
  skipUpdate?: boolean;
}
interface IupdateSettings {
  settings: {
    [key: string]: string;
  };
  skipUpdate?: boolean;
}
interface IupdateEditableElement {
  contentEditableUid: TNodeUid;
  eventListenerRef: React.MutableRefObject<eventListenersStatesRefType>;
  eventSource: "esc" | "click";
}
interface Icopy {
  uids?: TNodeUid[];
  skipUpdate?: boolean;
}
interface Ipaste {
  targetNode?: TNode;
  content?: string;
  pasteContent?: string;
  pastePosition?: "before" | "after" | "inside";
  skipUpdate?: boolean;
}

interface Iungroup {
  uids?: TNodeUid[];
  skipUpdate?: boolean;
}

interface Igroup {
  uids?: TNodeUid[];
  skipUpdate?: boolean;
}
interface Iremove {
  uids?: TNodeUid[];
  skipUpdate?: boolean;
  content?: string;
}
interface Imove {
  selectedUids: TNodeUid[];
  targetUid: TNodeUid;
  isBetween: boolean;
  position: number;
  skipUpdate?: boolean;
}

export {
  Iadd,
  Iduplicate,
  IupdateSettings,
  IupdateEditableElement,
  Icopy,
  Ipaste,
  Igroup,
  Iungroup,
  Iremove,
  Imove,
};
