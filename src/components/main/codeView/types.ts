import { TNodeTreeData } from "@_node/types";

export type CodeViewProps = {
  offsetTop: string | number;
  offsetBottom: number | string;
  offsetLeft: number | string;
  width: number | string;
  height: number | string;
  dropCodeView: (e: React.DragEvent<HTMLDivElement>) => void;
  dragCodeView: (e: React.DragEvent<HTMLDivElement>) => void;
  dragEndCodeView: (e: React.DragEvent<HTMLDivElement>) => void;
  codeViewDragging: boolean;
};

export type CursorPos = {
  lineNumber: number;
  column: number;
};

export type CodeSelection = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

export type EditorChange = {
  value: string;
  htmlDom: any;
  nodeTree: TNodeTreeData;
  configs?: {
    matchIds?: string[] | null;
    skipFromChildren?: boolean;
  };
};
