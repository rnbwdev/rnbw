import { editor, Range } from "monaco-editor";

import { TNodeTreeData, TNodeUid } from "../";

export const copyCode = ({
  nodeTree,
  uids,
  codeViewInstanceModel,
}: {
  nodeTree: TNodeTreeData;
  uids: TNodeUid[];
  codeViewInstanceModel: editor.ITextModel;
}): string => {
  let copiedCode = "";
  uids.forEach((uid) => {
    const node = nodeTree[uid];
    if (node) {
      const { startLine, startCol, endLine, endCol } =
        node.data.sourceCodeLocation;
      const text = codeViewInstanceModel.getValueInRange(
        new Range(startLine, startCol, endLine, endCol),
      );
      copiedCode += text;
    }
  });
  return copiedCode;
};
export const pasteCode = ({
  nodeTree,
  focusedItem,
  addToBefore = false,
  codeViewInstanceModel,
  code,
}: {
  nodeTree: TNodeTreeData;
  focusedItem: TNodeUid;
  addToBefore?: boolean;
  codeViewInstanceModel: editor.ITextModel;
  code: string;
}) => {
  const focusedNode = nodeTree[focusedItem];
  const { startLine, startCol, endLine, endCol } =
    focusedNode.data.sourceCodeLocation;
  const edit = {
    range: new Range(
      addToBefore ? startLine : endLine,
      addToBefore ? startCol : endCol,
      addToBefore ? startLine : endLine,
      addToBefore ? startCol : endCol,
    ),
    text: code,
  };
  codeViewInstanceModel.applyEdits([edit]);
};
export const replaceContent = ({
  nodeTree,
  focusedItem,
  content,
  codeViewInstanceModel,
}: {
  nodeTree: TNodeTreeData;
  focusedItem: TNodeUid;
  content: string;
  codeViewInstanceModel: editor.ITextModel;
}) => {
  const focusedNode = nodeTree[focusedItem];
  const { startTag, endTag } = focusedNode.data.sourceCodeLocation;
  if (startTag && endTag) {
    const edit = {
      range: new Range(
        startTag.endLine,
        startTag.endCol,
        endTag.startLine,
        endTag.startCol,
      ),
      text: content,
    };
    codeViewInstanceModel.applyEdits([edit]);
  }
};
export const addAttr = ({
  attrName,
  attrValue,
  nodeTree,
  focusedItem,
  codeViewInstanceModel,
}: {
  attrName: string;
  attrValue: string;
  nodeTree: TNodeTreeData;
  focusedItem: TNodeUid;
  codeViewInstanceModel: editor.ITextModel;
}) => {
  const focusedNode = nodeTree[focusedItem];
  const { startTag } = focusedNode.data.sourceCodeLocation;

  const text = codeViewInstanceModel.getValueInRange(
    new Range(
      startTag.startLine,
      startTag.startCol,
      startTag.endLine,
      startTag.endCol - 1,
    ),
  );
  const attr = `${attrName}="${attrValue}"`;
  const pattern = new RegExp(`${attrName}="(.*?)"`, "g");
  const replace = pattern.test(text);
  const content = replace ? text.replace(pattern, attr) : ` ${attr}`;

  if (startTag) {
    const edit = {
      range: replace
        ? new Range(
            startTag.startLine,
            startTag.startCol,
            startTag.endLine,
            startTag.endCol - 1,
          )
        : new Range(
            startTag.endLine,
            startTag.endCol - 1,
            startTag.endLine,
            startTag.endCol - 1,
          ),
      text: content,
    };
    codeViewInstanceModel.applyEdits([edit]);
  }
};
