import React from 'react'
import PropTypes from 'prop-types'

import InputButton from './InputButton'
import Modal from './Modal'


export default class ModalPrompt extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onOpenToggle: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.node.isRequired,
  }

  underlayOnClick(e) {
    // This stops click events falling through to underlying modals.
    e.stopPropagation();
  }

  render() {
    return <Modal
      data-wd-key="modal:prompt"
      isOpen={this.props.isOpen}
      underlayClickExits={false}
      underlayProps={{
        onClick: (e) => this.underlayOnClick(e)
      }}
      title={this.props.title}
      onOpenToggle={this.props.onOpenToggle}
    >
      {this.props.message}
      <p className="maputnik-dialog__buttons">
        <InputButton onClick={() => this.props.onOpenToggle(true)}>
          Yes
        </InputButton>
        <InputButton onClick={() => this.props.onOpenToggle(false)}>
          No
        </InputButton>
      </p>
    </Modal>
  }
}

