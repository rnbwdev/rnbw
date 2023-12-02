import { setDidRedo, setDidUndo } from "@_redux/main/processor";
import { useAppState } from "@_redux/useAppState";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

export const useHms = () => {
  const dispatch = useDispatch();
  const { didUndo, didRedo } = useAppState();

  useEffect(() => {
    didUndo && dispatch(setDidUndo(false));
    didRedo && dispatch(setDidRedo(false));
  }, [didUndo, didRedo]);
};