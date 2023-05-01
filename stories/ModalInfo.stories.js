import React from 'react';
import ModalInfo from '../src/components/ModalInfo';
import {Wrapper} from './ui';
import {withA11y} from '@storybook/addon-a11y';


export default {
  title: 'ModalInfo',
  component: ModalInfo,
  decorators: [withA11y],
};

export const Basic = () => (
  <Wrapper>
    <div style={{maxHeight: "200px"}}>
      <ModalInfo
        isOpen={true}
        title="Information"
        message="The style has been loaded successfully!"
      />
    </div>
  </Wrapper>
);

