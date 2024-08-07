import React from "react";
import { TreeItemProps } from "./types";

export const TreeItem = (props: TreeItemProps) => {
  const {
    context,
    children,
    depth,
    arrow,
    eventHandlers,
    id,
    nodeIcon,
    item,
    invalidFileNodes,
  } = props;

  const outlineStyles = {
    outlineWidth: '1px',
    outlineStyle: 'solid',
    outlineOffset: '-1px',
  };

  return (
    <li
      className={`${context.isSelected && "background-secondary"}`}
      {...context.itemContainerWithChildrenProps}
      id={id}
    >
      <div
        className={`justify-stretch padding-xs ${
          props.context.isSelected && "background-tertiary"
        } ${invalidFileNodes?.[item?.data?.uid] && "opacity-m"}`}
        style={{
          flexWrap: "nowrap",
          paddingLeft: `${depth * 18}px`,
          outlineColor: 'var(--color-tertiary-background)',
          ...(props.context.isSelected
            ? { outline: 'none' }
            : (!props.context.isSelected && props.context.isFocused) || props.context.isDraggingOver
            ? outlineStyles
            : {}),
        }}
        {...context.itemContainerWithoutChildrenProps}
        {...context.interactiveElementProps}
        {...eventHandlers}
      >
        <div className="gap-s padding-xs" style={{ width: "100%" }}>
          {arrow}
          {nodeIcon}
        </div>
      </div>

      {context.isExpanded ? <div>{children}</div> : null}
    </li>
  );
};