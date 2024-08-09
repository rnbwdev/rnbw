import {
  AddFileActionPrefix,
  AddNodeActionPrefix,
  RenameFileActionPrefix,
  RenameNodeActionPrefix,
  RootNodeUid,
} from "@src/rnbwTSX";
import { THtmlReferenceData } from "@_types/main";

import {
  TBasicNodeData,
  TNode,
  TNodeReferenceData,
  TNodeTreeData,
  TNodeUid,
} from "./types";
import { THtmlNodeData } from "./node";
import { editor } from "monaco-editor";

export const getSubNodeUidsByBfs = (
  uid: TNodeUid,
  tree: TNodeTreeData,
  withItSelf: boolean = true,
): TNodeUid[] => {
  const subUids: TNodeUid[] = [];

  const uids = [uid];
  while (uids.length) {
    const subUid = uids.shift() as TNodeUid;
    const subNode = tree[subUid];
    if (subNode) {
      subUids.push(subUid);
      uids.push(...subNode.children);
    }
  }

  !withItSelf && subUids.shift();

  return subUids;
};
export const getSubNodeUidsByDfs = (
  uid: TNodeUid,
  tree: TNodeTreeData,
  withItSelf: boolean = true,
): TNodeUid[] => {
  const subUids: TNodeUid[] = [];

  const uids = [uid];
  while (uids.length) {
    const subUid = uids.shift() as TNodeUid;
    const subNode = tree[subUid];
    subUids.push(subUid);
    uids.splice(0, 0, ...subNode.children);
  }

  !withItSelf && subUids.shift();

  return subUids;
};
export const getNodeChildIndex = (parentNode: TNode, node: TNode): number => {
  let childIndex = 0;
  if (parentNode === undefined) return childIndex;

  for (const uid of parentNode.children) {
    if (uid === node.uid) break;
    ++childIndex;
  }

  return childIndex;
};
export const getNodeUidsFromPaths = (
  validNodeTree: TNodeTreeData,
  paths: string[],
): TNodeUid[] => {
  const pathsObj: { [path: string]: true } = {};
  paths.map((path) => {
    pathsObj[path] = true;
  });

  const _uids: TNodeUid[] = [];
  const uids = getSubNodeUidsByBfs(RootNodeUid, validNodeTree);
  uids.map((uid) => {
    const { data } = validNodeTree[uid];
    const { path } = data;
    if (pathsObj[path]) _uids.push(uid);
  });

  return getValidNodeUids(validNodeTree, _uids);
};
export const getValidNodeUids = (
  tree: TNodeTreeData,
  uids: TNodeUid[],
  targetUid?: TNodeUid,
  treeType?: string,
  referenceData?: TNodeReferenceData,
): TNodeUid[] => {
  let validatedUids: { [uid: TNodeUid]: boolean } = {};

  // validate collection
  uids.map((uid) => {
    // remove parent uids
    let parentNode = tree[uid];
    while (parentNode.uid !== RootNodeUid) {
      parentNode = tree[parentNode.parentUid!];
      delete validatedUids[parentNode.uid];
    }

    // remove nested uids
    Object.keys(validatedUids).map((validatedUid) => {
      let validatedNode = tree[validatedUid];
      while (validatedNode.uid !== RootNodeUid) {
        validatedNode = tree[validatedNode.parentUid!];
        if (validatedNode.uid === uid) {
          delete validatedUids[validatedUid];
          break;
        }
      }
    });

    // add current uid
    validatedUids[uid] = true;
  });

  // validate target
  if (targetUid) {
    let targetNode = tree[targetUid];
    while (targetNode.uid !== RootNodeUid) {
      delete validatedUids[targetNode.uid];
      targetNode = tree[targetNode.parentUid!];
    }

    if (treeType === "html") {
      const { elements } = referenceData as THtmlReferenceData;

      const targetNode = tree[targetUid];
      const targetNodeData = targetNode.data as THtmlNodeData;
      const targetRefData = elements[targetNodeData.name];

      if (targetRefData) {
        if (targetRefData.Contain === "All") {
          // do nothing
        } else if (targetRefData.Contain === "None") {
          validatedUids = {};
        } else {
          const containTagObj: { [uid: TNodeUid]: boolean } = {};
          const tagList = targetRefData.Contain.replace(/ /g, "").split(",");
          tagList.map((tag: string) => {
            const pureTag = tag.slice(1, tag.length - 1);
            containTagObj[pureTag] = true;
          });

          Object.keys(validatedUids).map((uid) => {
            const node = tree[uid];
            const nodeData = node.data as THtmlNodeData;
            if (!containTagObj[nodeData.name]) {
              delete validatedUids[uid];
            }
          });
        }
      }
    }
  }

  return uids.filter((uid) => validatedUids[uid]);
};

export const isAddNodeAction = (actionName: string): boolean => {
  return actionName.startsWith(AddNodeActionPrefix) ? true : false;
};
export const isRenameNodeAction = (actionName: string): boolean => {
  return actionName.startsWith(RenameNodeActionPrefix) ? true : false;
};
export const isAddFileAction = (actionName: string): boolean => {
  return actionName.startsWith(AddFileActionPrefix) ? true : false;
};
export const isRenameFileAction = (actionName: string): boolean => {
  return actionName.startsWith(RenameFileActionPrefix) ? true : false;
};

// -------------------------------
export const getPrevSiblingNodeUid = (
  tree: TNodeTreeData,
  node: TNode,
): TNodeUid => {
  let beforeUid = "" as TNodeUid;

  const parentNode = tree[node.parentUid!];
  for (const uid of parentNode.children) {
    if (uid === node.uid) break;
    beforeUid = uid;
  }

  return beforeUid;
};
export const getValidPrevNodeUid = (
  tree: TNodeTreeData,
  node: TNode,
): TNodeUid => {
  let prevNodeUid = "" as TNodeUid;

  const parentNode = tree[node.parentUid!];
  for (const uid of parentNode.children) {
    if (uid === node.uid) break;

    const childNode = tree[uid];
    const childNodeData = childNode.data as TBasicNodeData;
    if (!childNodeData.valid) continue;

    prevNodeUid = uid;
  }

  return prevNodeUid === "" ? parentNode.uid : prevNodeUid;
};
export const getNodeDepth = (tree: TNodeTreeData, uid: TNodeUid): number => {
  let nodeDepth = 0,
    node = tree[uid];

  while (node.uid !== RootNodeUid) {
    node = tree[node.parentUid!];
    ++nodeDepth;
  }

  return nodeDepth;
};
export const getNodeDepthExternal = (
  tree: TNodeTreeData,
  uid: TNodeUid,
): number => {
  let nodeDepth = 0,
    node = tree[uid];

  while (node.uid !== RootNodeUid) {
    node = tree[node.parentUid!];
    ++nodeDepth;
  }

  return nodeDepth;
};
export const isUidDecoration = (decoration: editor.IModelDecoration) => {
  return decoration.options.className?.startsWith("uid-");
};
export const getUidDecorations = (
  model: editor.ITextModel | null | undefined,
) => {
  return model?.getAllDecorations().filter(isUidDecoration) || [];
};
export const getDecorationUid = (decoration: editor.IModelDecoration) => {
  const className = decoration.options.className as string;
  return className.replace(/\D/g, "");
};
export const setDecorationUid = (
  decoration: editor.IModelDecoration | editor.IModelDeltaDecoration,
  uid: TNodeUid,
) => {
  decoration.options.className = `uid-${uid}`;
};
