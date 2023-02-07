import { useMemo } from 'react';
import { match } from 'ts-pattern';
import { ELEMENT_DATATYPE } from '../constants';
import { useLayoutEditorContext } from '../hooks';
import { ElementStore } from '../types';
import { LayoutRender } from './layout-render';
import { TextRender } from './text-render';

interface Props {
  id: string;
  width: number;
}

const typeSelector = <T extends ElementStore['value']['type']>(type: T) => ({
  value: { type },
});
const ElementRenderSwitch = ({ id, width }: Props) => {
  const { elements } = useLayoutEditorContext();
  const element = useMemo(() => elements.value[id], [id, elements]);
  return match(element)
    .with(typeSelector('layout'), (element) => (
      <LayoutRender element={element} width={width} />
    ))
    .with(typeSelector('text'), (element) => <TextRender element={element} />)
    .with(typeSelector('image'), (element) => (
      <img
        src='https://placekitten.com/200/150'
        style={{ maxWidth: '100%', pointerEvents: 'none' }}
        alt='cat'
      />
    ))
    .exhaustive();
};

export const ElementRender = ({ id, width }: Props) => (
  <div id={id} datatype={ELEMENT_DATATYPE} style={{ width }}>
    <ElementRenderSwitch id={id} width={width} />
  </div>
);
