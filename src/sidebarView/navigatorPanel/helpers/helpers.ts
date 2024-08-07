import { TFileNode } from "@_api/file";
import { THtmlNodeData } from "@_api/node";
import { TNode, TNodeTreeData } from "@_api/types";
import { TProject, TWorkspace } from "@_redux/main/fileTree";

export const isHomeIcon = (node: TNode) =>
  node.data.type == "html" &&
  node.data.name == "index" &&
  node.parentUid === "ROOT";

export const isSelected = (
  _project: Omit<TProject, "handler">,
  project: Omit<TProject, "handler">,
) => {
  return _project.context === project.context && _project.name === project.name
    ? "selected"
    : "";
};

export const getFileNameFromPath = (file: TFileNode) => {
  return file.uid.split("/")[file.uid.split("/").length - 1];
};
export const getFileExtension = (node: TFileNode) => node.data.ext;

export const setWorkspaceFavicon = (
  validNodeTree: TNodeTreeData,
  project: Omit<TProject, "handler">,
  workspace: TWorkspace,
  setWorkspace: (ws: TWorkspace) => void,
) => {
  for (const x in validNodeTree) {
    const nodeData = validNodeTree[x].data as THtmlNodeData;
    if (
      nodeData &&
      nodeData.type === "tag" &&
      nodeData.name === "link" &&
      nodeData.attribs.rel === "icon"
    ) {
      const _projects: TProject[] = [];
      const pts = workspace.projects as TProject[];
      pts.map((_v) => {
        if (_v.name != "idb") {
          _projects.push({
            context: _v.context,
            name: _v.name,
            handler: _v.handler,
            favicon:
              _v.name === project.name
                ? window.location.origin +
                  "/rnbw/" +
                  project.name +
                  "/" +
                  nodeData.attribs.href
                : _v.favicon,
          });
        }
      });
      setWorkspace({ name: workspace.name, projects: _projects });
    }
  }
};
