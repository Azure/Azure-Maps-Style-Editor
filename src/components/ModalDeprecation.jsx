import React from 'react'
import { MdErrorOutline } from "react-icons/md";
import PropTypes from 'prop-types'
import ModalLoading from './ModalLoading'
import Modal from './Modal'

export default class ModalDeprecation extends React.Component {
  static propTypes = {
    onStyleOpen: PropTypes.func.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onOpenToggle: PropTypes.func.isRequired,
    azureMapsExtension: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      activeRequest: null,
      activeRequestMessage: "",
      error: null,
    };
  }

  clearError() {
    this.setState({
      error: null
    })
  }

  onCancelActiveRequest(e) {
    // Else the click propagates to the underlying modal
    if(e) e.stopPropagation();

    if(this.state.activeRequest) {
      this.state.activeRequest.abort();
      this.setState({
        activeRequest: null,
        activeRequestMessage: ""
      });
    }
  }

  onOpenToggle() {
    this.clearError();
    this.props.onOpenToggle();
  }

  render() {
    let errorElement;
    if(this.state.error) {
      errorElement = (
        <div className="maputnik-modal-error">
          {this.state.error}
          <a href="#" onClick={() => this.clearError()} className="maputnik-modal-error-close">×</a>
        </div>
      );
    }

    return (
      <div>
        <Modal
          data-wd-key="modal:open"
          isOpen={this.props.isOpen}
          onOpenToggle={() => this.onOpenToggle()}
          title={'Azure Maps Creator retirement'}
          underlayClickExits={false}
        >
          {errorElement}    
          <section className="maputnik-modal-section">
            <h1> <MdErrorOutline /> Note</h1>
            <h4>
            The Azure Maps Creator indoor map service is now deprecated and will be retired on 9/30/25.
            </h4>
            <h4>
                For more information, see <a href='https://aka.ms/AzureMapsCreatorDeprecation'>End of Life Announcement of Azure Maps Creator.</a>
            </h4>
          </section>
        </Modal>

        <ModalLoading
          isOpen={!!this.state.activeRequest}
          title="Loading..."
          onCancel={(e) => this.onCancelActiveRequest(e)}
          message={this.state.activeRequestMessage}
        />
      </div>
    )
  }
}

