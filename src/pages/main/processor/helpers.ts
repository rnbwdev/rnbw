import { Dispatch } from "react";

import {
  NodePathSplitter,
  RootNodeUid,
  StagePreviewPathPrefix,
} from "@_constants/main";
import {
  TFileHandlerCollection,
  TFileNode,
  TFileNodeData,
  TFileNodeTreeData,
} from "@_node/file";
import { _writeIDBFile } from "@_node/file/nohostApis";
import { getNodeChildIndex, getSubNodeUidsByBfs } from "@_node/helpers";
import { THtmlNodeData } from "@_node/node";
import { TNode, TNodeTreeData, TNodeUid } from "@_node/types";
import { setFileTreeNodes, TProject } from "@_redux/main/fileTree";
import { AnyAction } from "@reduxjs/toolkit";

export const saveFileContent = async (
  project: Omit<TProject, "handler">,
  fileHandlers: TFileHandlerCollection,
  uid: string,
  fileData: TFileNodeData,
) => {
  if (project.context === "local") {
    const handler = fileHandlers[uid];
    const writableStream = await (
      handler as FileSystemFileHandle
    ).createWritable();
    await writableStream.write(fileData.content);
    await writableStream.close();
  }

  await _writeIDBFile(fileData.path, fileData.content);
  fileData.changed = false;
  fileData.orgContent = fileData.content;
};
export const getPreviewPath = (
  fileTree: TFileNodeTreeData,
  file: TFileNode,
) => {
  const { data: fileData } = file;
  const p_fileData = fileTree[file.parentUid!].data;
  const previewPath = `${p_fileData.path}/${StagePreviewPathPrefix}${fileData.name}.${fileData.ext}`;
  return previewPath;
};
export const getNodeUidToBeSelectedAtFirst = (validNodeTree: TNodeTreeData) => {
  let bodyNode: TNode | null = null;

  const uids = getSubNodeUidsByBfs(RootNodeUid, validNodeTree);
  for (const uid of uids) {
    const node = validNodeTree[uid];
    const nodeData = node.data as THtmlNodeData;

    if (nodeData.tagName === "body" && nodeData.nodeName === "body") {
      bodyNode = node;
      break;
    }
  }
  const firstBodyNode = bodyNode?.children.find(
    (item) => validNodeTree[item].displayName !== "#text",
  );

  return bodyNode === null
    ? uids[0]
    : bodyNode.children.length > 0
      ? firstBodyNode || bodyNode.children[0]
      : bodyNode.uid;
};
export const getNeedToExpandNodeUids = (
  validNodeTree: TNodeTreeData,
  selectedNodeUids: TNodeUid[],
): TNodeUid[] => {
  const _expandedItems: TNodeUid[] = [];
  selectedNodeUids.map((uid) => {
    let node = validNodeTree[uid];

    // TODO
    if (!node) return;

    while (node.uid !== RootNodeUid) {
      _expandedItems.push(node.uid);
      node = validNodeTree[node.parentUid!];
    }
  });
  return _expandedItems;
};
export const markChangedFolders = (
  fileTree: TFileNodeTreeData,
  file: TFileNode,
  dispatch: Dispatch<AnyAction>,
  value: boolean,
) => {
  const parentFiles: TFileNode[] = [];
  while (file.parentUid) {
    const parentFile = structuredClone(fileTree[file.parentUid]);

    // Depending on value folders are marked or unmarked
    parentFile.data.changed = value;
    parentFiles.push(parentFile);
    file = parentFile;
  }
  parentFiles.length && dispatch(setFileTreeNodes(parentFiles));
};
export const getValidNodeTree = (nodeTree: TNodeTreeData): TNodeTreeData => {
  const _nodeTree = structuredClone(nodeTree);
  const _validNodeTree: TNodeTreeData = {};
  const uids = getSubNodeUidsByBfs(RootNodeUid, _nodeTree);
  uids.reverse();
  uids.map((uid) => {
    const node = _nodeTree[uid];
    if (!node.data.valid) return;

    node.children = node.children.filter(
      (c_uid) => _nodeTree[c_uid].data.valid,
    );
    node.isEntity = node.children.length === 0;
    _validNodeTree[uid] = node;
  });

  const validUids = getSubNodeUidsByBfs(RootNodeUid, _validNodeTree, false);
  validUids.map((uid) => {
    const node = _validNodeTree[uid];
    const parentNode = _validNodeTree[node.parentUid!];
    const parentNodePath =
      node.parentUid === RootNodeUid ? RootNodeUid : parentNode.data.path;
    node.data.path = `${parentNodePath}${NodePathSplitter}${
      node.data.tagName
    }-${getNodeChildIndex(parentNode, node)}`;
  });
  return _validNodeTree;
};
