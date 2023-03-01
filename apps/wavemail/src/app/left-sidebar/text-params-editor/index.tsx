import React from 'react';
import { Collapse } from 'antd';
import {
  getElementFontSize,
  getElementLineHeight,
  getElementLetterSpacing,
  TextStore,
} from '@waveditors/editor-model';
import { AiOutlineFontSize, AiOutlineLineHeight } from 'react-icons/ai';
import { RxLetterSpacing } from 'react-icons/rx';
import styled from 'styled-components';
import { CollapseStyled } from '../../common/components';
import { PxValue, TextAlign } from './components';
import { Color } from './components/color';

const Root = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
`;

const PairedCell = styled.div`
  display: flex;
  gap: 5px;
`;

interface Props {
  text: TextStore;
}

export const TextParamsEditor = ({ text }: Props) => {
  return (
    <CollapseStyled>
      <Collapse.Panel key='text' header='Text'>
        <Root>
          <PxValue
            text={text}
            selector={getElementFontSize}
            styleKey='fontSize'
            icon={<AiOutlineFontSize />}
          />
          <PxValue
            text={text}
            selector={getElementLineHeight}
            styleKey='lineHeight'
            icon={<AiOutlineLineHeight />}
          />
          <PxValue
            text={text}
            selector={getElementLetterSpacing}
            styleKey='letterSpacing'
            icon={<RxLetterSpacing />}
            min='-100'
            max='100'
            step='0.1'
          />
          <PairedCell>
            <TextAlign text={text} />
            <Color text={text} />
          </PairedCell>
        </Root>
      </Collapse.Panel>
    </CollapseStyled>
  );
};