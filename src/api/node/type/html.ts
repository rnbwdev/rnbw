import { DOMElement } from "react";

import { Document } from "parse5/dist/tree-adapters/default";

import {
  TNode,
  TNodeData,
  TNodePositionInfo,
  TNodeSourceCodeLocation,
  TNodeTreeData,
  TNodeUid,
  TValidNodeUid,
} from "../../";

export type THtmlNode = TNode & {
  data: THtmlNodeData;
  validUid: TValidNodeUid;
};

export type THtmlNodeData = TNodeData & {
  nodeName: string;
  tagName: string;
  textContent: string;

  attribs: THtmlNodeAttribs;

  path?: string;
  sourceCodeLocation: TNodeSourceCodeLocation;
};

export type THtmlNodeAttribs = {
  [attrName: string]: string;
};

export type THtmlNodeTreeData = {
  [uid: TNodeUid]: THtmlNode;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type THtmlDomNode = DOMElement<any, HTMLElement> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [attrName: string]: any;
};

export type THtmlParserResponse = {
  contentInApp: string;
  nodeTree: TNodeTreeData;
  htmlDom: Document;
  selectedNodeUids: TNodeUid[];
  nodeUidPositions?: Map<TNodeUid, TNodePositionInfo> | null;
};
