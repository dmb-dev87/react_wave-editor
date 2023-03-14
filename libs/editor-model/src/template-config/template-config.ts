import {
  createStore,
  storeHookConstructor,
  StoreHookResult,
  UndoRedoModule,
} from '@waveditors/rxjs-react';
import { UndoRedoEvents } from '../types';
import { TemplateConfig, TemplateConfigFont } from './template-config.types';

export const templateConfigStore = ({
  undoRedo: { createUndoRedoEffect },
}: {
  undoRedo: UndoRedoModule<UndoRedoEvents>;
}) =>
  createStore<TemplateConfig>()
    .addActions({
      addFont: (font: TemplateConfigFont, state) => ({
        ...state,
        fonts: [...state.fonts, font],
      }),
      removeFont: (fontId: string, state) => ({
        ...state,
        fonts: state.fonts.filter((font) => font.id !== fontId),
      }),
      setFont: (
        { id, value }: { id: string; value: TemplateConfigFont },
        state: TemplateConfig
      ) => ({
        ...state,
        fonts: state.fonts.map((font) => {
          if (font.id !== id) return font;
          return value;
        }),
      }),
    })
    .addEffect(createUndoRedoEffect('TemplateStore'));

export type TemplateConfigStore = StoreHookResult<typeof templateConfigStore>;
export const useTemplateConfigStore = storeHookConstructor(templateConfigStore);
