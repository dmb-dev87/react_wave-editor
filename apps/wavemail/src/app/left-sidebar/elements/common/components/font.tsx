import { map, merge } from 'rxjs';
import {
  ElementStore,
  getTemplateConfigFonts,
  getTemplateConfigFontById,
  getElementFontRelationByElementId,
  getTemplateDefaultFont,
} from '@waveditors/editor-model';
import { useBsSelector, useObservable } from '@waveditors/rxjs-react';
import { useMailBuilderContext } from '../../../../common/hooks';
import {
  useCreateTemplateConfigFont,
  useRemoveTemplateConfigFont,
} from '../../../../common/actions-hooks';
import { FontSelector } from './font-selector';

interface Props {
  element: ElementStore;
}

export const Font = ({ element }: Props) => {
  const {
    config,
    stores: { relations },
  } = useMailBuilderContext();
  const createFont = useCreateTemplateConfigFont();
  const removeFont = useRemoveTemplateConfigFont();
  const elementFont = useObservable(
    merge(relations.bs, config.bs).pipe(
      map(() =>
        getElementFontRelationByElementId(element.getValue().id)(
          relations.getValue()
        )
      ),
      map((relation) =>
        relation
          ? getTemplateConfigFontById(relation)(config.getValue()) ?? null
          : null
      )
    ),
    null,
    [relations.bs, config.bs]
  );

  // @todo here should be font from closest parent
  const inheritedFont = useBsSelector(config.bs, getTemplateDefaultFont);
  const fonts = useBsSelector(config.bs, getTemplateConfigFonts);

  const font = elementFont || inheritedFont;
  return (
    <FontSelector
      value={font}
      fonts={fonts}
      inherited={!elementFont}
      onSelected={(font) =>
        relations.actions.addElementFontRelation({
          font,
          element: element.getValue().id,
        })
      }
      onFontCreate={(font) => createFont(font, element.getValue().id)}
      onFontRemove={removeFont}
      onFontChange={config.actions.setFont}
    />
  );
};