import useRnbw from "@_services/useRnbw";
import { Range, editor } from "monaco-editor";

import { PrettyCode, useElementHelper } from "@_services/useElementsHelper";
import { toast } from "react-toastify";

// helperModel added to update the code in the codeViewInstanceModel
// once when the action is executed, this improves the History Management
const helperModel = editor.createModel("", "html");

export default function useTurnInto() {
  const rnbw = useRnbw();
  const { isPastingAllowed, sortUidsDsc, findNodeToSelectAfterAction } =
    useElementHelper();

  const selectedElements = rnbw.elements.getSelectedElements();

  async function turnInto(tagName: string) {
    const sortedUids = sortUidsDsc(selectedElements);

    const codeViewInstanceModel = rnbw.files.getEditorRef().current?.getModel();
    if (!codeViewInstanceModel) return;
    helperModel.setValue(codeViewInstanceModel.getValue());

    // Checking if a parent component can have a tag as a child
    const { isAllowed } = isPastingAllowed({
      selectedItems: sortedUids,
      nodeToAdd: [tagName],
      checkFirstParents: true,
    });
    if (!isAllowed) {
      toast(`Turn into ${tagName} not allowed`, { type: "error" });
      return;
    }

    for (const uid of sortedUids) {
      const node = rnbw.elements.getElement(uid);
      if (!node) return;
      const nodeAttribute = rnbw.elements.getElementSettings(uid);

      // Getting existing tag attributes
      const attributeCode = Object.entries(nodeAttribute)
        .map(([attrName, attrValue]) => `${attrName}="${attrValue}"`)
        .join(" ");

      const { startTag, endTag, startLine, startCol, endLine, endCol } =
        node.data.sourceCodeLocation;
      if ((!startTag || !endTag) && node.displayName !== "#text") return;
      const innerCode = codeViewInstanceModel.getValueInRange(
        node.displayName === "#text"
          ? new Range(startLine, startCol, endLine, endCol)
          : new Range(
              startTag.endLine,
              startTag.endCol,
              endTag.startLine,
              endTag.startCol,
            ),
      );
      const newCode = `<${tagName} ${attributeCode}>${innerCode}</${tagName}>`;

      const formattedCode = await PrettyCode({ code: newCode, startCol });

      const edit = {
        range: new Range(startLine, startCol, endLine, endCol),
        text: formattedCode,
      };
      helperModel.applyEdits([edit]);
    }
    const code = helperModel.getValue();
    codeViewInstanceModel.setValue(code);

    await findNodeToSelectAfterAction({
      nodeUids: sortedUids,
      action: {
        type: "replace",
        tagNames: [tagName],
      },
    });
  }

  const config = {
    name: "Turn Into",
    action: turnInto,
    description: "Turn selected elements into a new tag",
    shortcuts: ["cmd+shift+t"],
  };

  return config;
}
