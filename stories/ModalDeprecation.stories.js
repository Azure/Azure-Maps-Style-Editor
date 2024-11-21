import React from 'react';
import ModalDeprecation from '../src/components/ModalDeprecation';
import {action} from '@storybook/addon-actions';
import {Wrapper} from './ui';
import {withA11y} from '@storybook/addon-a11y';


export default {
  title: 'ModalDeprecation',
  component: ModalDeprecation,
  decorators: [withA11y],
};

export const Basic = () => (
  <Wrapper>
    <div style={{maxHeight: "200px"}}>
      <ModalDeprecation
        isOpen={true}
        mapStyle={{}}
        onChangeMetadataProperty={action("onChangeMetadataProperty")}
        onStyleChanged={action("onStyleChanged")}
      />
    </div>
  </Wrapper>
);






