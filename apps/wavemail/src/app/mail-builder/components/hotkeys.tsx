import { filter, fromEvent, merge } from 'rxjs';
import { useSubscription } from '@waveditors/rxjs-react';
import { useBuilderContext } from '@waveditors/editor-model';
import { message } from 'antd';
import { useEditorKeyboardEvents } from '../../common/hooks';
import { useRemoveSelected } from '../../common/actions-hooks';
import { useSaveRenderContext } from '../../templates';

const HotkeyActions = {
  undo: 'KeyZ',
  redo: 'KeyX',
  save: 'KeyS',
  load: 'KeyL',
  remove: 'Backspace',
};

export const Hotkeys = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const {
    module: { undoRedo },
  } = useBuilderContext();
  const removeSelected = useRemoveSelected();
  const editorKeyboardEvents = useEditorKeyboardEvents();
  const saveRenderContext = useSaveRenderContext();

  useSubscription(() => {
    const keyboardEvents = fromEvent<KeyboardEvent>(document, 'keydown');

    return (
      editorKeyboardEvents
        ? merge(editorKeyboardEvents, keyboardEvents)
        : keyboardEvents
    )
      .pipe(
        filter(
          (e) =>
            Object.values(HotkeyActions).includes(e.code) &&
            (e.metaKey || e.ctrlKey)
        )
      )
      .subscribe((e) => {
        e.preventDefault();
        switch (e.code) {
          case HotkeyActions.undo:
            return undoRedo.undo.next();
          case HotkeyActions.redo:
            return undoRedo.redo.next();
          case HotkeyActions.save: {
            messageApi.info('Saved successfully');
            return saveRenderContext();
          }
          case HotkeyActions.remove:
            return removeSelected();
        }
      });
  }, [undoRedo, editorKeyboardEvents]);
  return contextHolder;
};
