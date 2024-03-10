import {
  ReactNode,
  MouseEventHandler,
  FocusEventHandler,
  DragEventHandler,
} from "react";
import { TreeItem, TreeItemRenderContext } from "react-complex-tree";

export interface TreeItemProps<T = any, C extends string = never> {
  eventHandlers: EventHandlers;
  key?: string;
  id: string;
  nodeIcon: ReactNode;
  depth: number;
  children: ReactNode | null;
  arrow: ReactNode;
  context: TreeItemRenderContext<C>;
}
export interface EventHandlers {
  onClick: MouseEventHandler<HTMLElement>;
  onDoubleClick?: MouseEventHandler<HTMLElement>;
  onMouseEnter: MouseEventHandler<HTMLElement>;
  onMouseLeave: MouseEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  onDragStart: DragEventHandler<HTMLElement>;
  onDragEnter: DragEventHandler<HTMLElement>;
}
export interface ItemTitleProps {
  title: string;
  isChanged?: boolean;
}
export interface ItemArrowProps {
  item: TreeItem<any>;
  context: TreeItemRenderContext<never>;
  onClick?: () => void;
}
export interface ContainerProps {
  children: React.ReactNode;
  containerProps: React.HTMLProps<any>;
}