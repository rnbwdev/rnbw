import { AppState } from "@_redux/_root";
import { createSelector } from "@reduxjs/toolkit";

const getCodeViewTabSize = (state: AppState): number =>
  state.main.codeView.codeViewTabSize;
export const codeViewTabSizeSelector = createSelector(
  getCodeViewTabSize,
  (codeViewTabSize) => codeViewTabSize,
);