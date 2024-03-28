import * as parse5 from "parse5";

import { RainbowAppName } from "@_constants/global";
import { RootNodeUid } from "@_constants/main";

import { TFileParserResponse, TNodeUid } from "../../";
import {
  THtmlDomNode,
  THtmlNode,
  THtmlNodeAttribs,
  THtmlNodeTreeData,
  THtmlParserResponse,
} from "../../node/type/html";
import { PARSING_ERROR_MESSAGES, StageNodeIdAttr } from "./constants";
import { toast } from "react-toastify";

const parseHtml = (content: string): THtmlParserResponse => {
  const htmlDom = parse5.parse(content, {
    scriptingEnabled: true,
    sourceCodeLocationInfo: true,
    onParseError: (err) => {
      console.error(err);

      if (
        Object.prototype.hasOwnProperty.call(PARSING_ERROR_MESSAGES, err.code)
      ) {
        toast(PARSING_ERROR_MESSAGES[err.code], {
          type: "warning",
          toastId: PARSING_ERROR_MESSAGES[err.code],
        });
      }
    },
  });

  const nodeTree: THtmlNodeTreeData = {};
  (() => {
    nodeTree[RootNodeUid] = {
      uid: RootNodeUid,
      parentUid: null,

      displayName: RootNodeUid,

      isEntity: true,
      children: [],

      data: {
        childNodes: htmlDom.childNodes,

        valid: true,

        nodeName: "",
        tagName: "",
        textContent: "",

        attribs: {},

        sourceCodeLocation: {
          startLine: 0,
          startCol: 0,
          startOffset: 0,
          endLine: 0,
          endCol: 0,
          endOffset: 0,
        },
      },
    };
    const seedNodes: THtmlNode[] = [nodeTree[RootNodeUid]];
    let _uid = 0;

    const getHtmlNodeAttribs = (
      uid: TNodeUid,
      attrs: { name: string; value: string }[],
    ): THtmlNodeAttribs => {
      const attribs: THtmlNodeAttribs = {
        [StageNodeIdAttr]: uid,
      };
      attrs.map((attr) => {
        attribs[attr.name] = attr.value;
      });
      return attribs;
    };
    const proceedWithNode = (
      uid: TNodeUid,
      parentUid: TNodeUid,
      node: THtmlDomNode,
      nodeTree: THtmlNodeTreeData,
    ) => {
      const {
        startLine = 0,
        startCol = 0,
        startOffset = 0,
        endLine = 0,
        endCol = 0,
        endOffset = 0,
        startTag,
        endTag,
      } = node.sourceCodeLocation || {};

      nodeTree[parentUid].children.push(uid);
      nodeTree[parentUid].isEntity = false;

      nodeTree[uid] = {
        uid,
        parentUid: parentUid,

        displayName: node.nodeName,

        isEntity: true,
        children: [],

        data: {
          childNodes: node.childNodes,
          valid:
            node.nodeName == "#documentType" || node.nodeName == "#text"
              ? !!node?.value?.replace(/[\n\s]/g, "").length
              : true,

          nodeName: node.nodeName,
          tagName: node.tagName || "",
          textContent: node.value || "",

          attribs: getHtmlNodeAttribs(uid, node.attrs || []),

          sourceCodeLocation: {
            startLine,
            startCol,
            startOffset,
            endLine,
            endCol,
            endOffset,
            startTag,
            endTag,
          },
        },
      };
      if (!node.attrs) node.attrs = [];
      node.attrs.push({ name: StageNodeIdAttr, value: uid });
    };

    while (seedNodes.length) {
      const node = seedNodes.shift() as THtmlNode;
      if (!node.data.childNodes) continue;

      node.data.childNodes.map((child: THtmlDomNode) => {
        const uid = String(++_uid);

        if (child.nodeName === "title") {
          window.document.title =
            child?.childNodes?.[0]?.value ?? RainbowAppName;
        }

        proceedWithNode(uid, node.uid, child, nodeTree);
        seedNodes.push(nodeTree[uid]);
      });
    }
  })();

  const uids = Object.keys(nodeTree);
  uids.map((uid) => {
    const node = nodeTree[uid];
    delete node.data.childNodes;
  });

  const contentInApp = parse5.serialize(htmlDom);

  return {
    contentInApp,
    nodeTree,
    htmlDom,
  };
};

export const fileHandlers: {
  [ext: string]: (content: string) => TFileParserResponse;
} = {
  html: parseHtml,
};
