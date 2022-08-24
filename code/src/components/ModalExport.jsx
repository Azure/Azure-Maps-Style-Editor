import React from 'react'
import PropTypes from 'prop-types'
import FieldString from './FieldString'
import InputButton from './InputButton'
import ModalLoading from './ModalLoading'
import ModalInfo from './ModalInfo'
import ModalPrompt from './ModalPrompt'
import Modal from './Modal'
import { MdCloudUpload } from 'react-icons/md'


export default class ModalExport extends React.Component {
  static propTypes = {
    mapStyle: PropTypes.object.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onOpenToggle: PropTypes.func.isRequired,
    azureMapsExtension: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      activeInfo: null,
      activePromptCallback: null,
      activePromptMessage: "",
      activeRequest: null,
      activeRequestMessage: "",
      error: null,
      azMapsStyleAlias: this.props.azureMapsExtension.styleAlias,
      azMapsStyleDescription: this.props.azureMapsExtension.styleDescription,
      azMapsMapConfigurationAlias: this.props.azureMapsExtension.mapConfigurationAlias,
      azMapsMapConfigurationDescription: this.props.azureMapsExtension.mapConfigurationDescription
    }
  }

  clearError() {
    this.setState({
      activeInfo: null,
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

  onChangeAzureMapsStyleDescription = (styleDescription) => {
    this.props.azureMapsExtension.styleDescription = styleDescription;
    this.setState({
      azMapsStyleDescription: styleDescription
    });
  }

  onChangeAzureMapsStyleAlias = (styleAlias) => {
    this.props.azureMapsExtension.styleAlias = styleAlias;
    this.setState({
      azMapsStyleAlias: styleAlias
    });
  }

  onChangeAzureMapsMapConfigurationDescription = (mapConfigurationDescription) => {
    this.props.azureMapsExtension.mapConfigurationDescription = mapConfigurationDescription;
    this.setState({
      azMapsMapConfigurationDescription: mapConfigurationDescription
    });
  }

  onChangeAzureMapsMapConfigurationAlias = (mapConfigurationAlias) => {
    this.props.azureMapsExtension.mapConfigurationAlias = mapConfigurationAlias;
    this.setState({
      azMapsMapConfigurationAlias: mapConfigurationAlias
    });
  }

  onClickUploadAzureMapsMapConfiguration = (e) => {
    e.preventDefault();

    this.clearError();

    this.props.azureMapsExtension.getStyleId(this.props.azureMapsExtension.styleAlias)
    .then(styleId => {
      if (styleId) {
        this.setState({
          activePromptCallback: (confirmed) => {
            this.setState({
              activePromptCallback: null,
              activePromptMessage: ""
            });
            if (confirmed) {
              this.checkExistingMapConfigurationAndUpload();
            }
          },
          activePromptMessage: "Do you want to overwrite style "+this.props.azureMapsExtension.styleAlias+"?"
        });
      } else {
        this.checkExistingMapConfigurationAndUpload();
      }
    });
  }

  checkExistingMapConfigurationAndUpload = () => {
    this.props.azureMapsExtension.getMapConfigurationId(this.props.azureMapsExtension.mapConfigurationAlias)
    .then(mapConfigurationId => {
      if (mapConfigurationId) {
        this.setState({
          activePromptCallback: (confirmed) => {
            this.setState({
              activePromptCallback: null,
              activePromptMessage: ""
            });
            if (confirmed) {
              this.uploadAzureMapsMapConfiguration();
            }
          },
          activePromptMessage: "Do you want to overwrite map configuration "+this.props.azureMapsExtension.mapConfigurationAlias+"?"
        });
      } else {
        this.uploadAzureMapsMapConfiguration();
      }
    });
  }

  uploadAzureMapsMapConfiguration = () => {
    let canceled;
    let resultingStyleId;

    this.props.azureMapsExtension.uploadResultingStyle(this.props.mapStyle, canceled)
    .then(styleId => {
      if(canceled) {
        return;
      }

      this.setState({
        activeRequestMessage: "Successfully uploaded style! Uploading map configuration..."
      });

      resultingStyleId = styleId;
      return this.props.azureMapsExtension.uploadResultingMapConfiguration(styleId, canceled);
    })
    .then(mapConfigurationId => {
      if(canceled) {
        return;
      }

      this.setState({
        activeInfo: ["Success!", "Style ID: "+resultingStyleId, "Map configuration ID: "+mapConfigurationId],
        activeRequest: null,
        activeRequestMessage: ""
      });
    })
    .catch(err => {
      let errorMessage = 'Failed to upload map configuration';
      if (err.response?.error?.message) {
        errorMessage = err.response.error.message;
      }
      if (err.reason === "user") {
        errorMessage = null;
      } else {
        console.error(err)
        console.warn('Could not upload map configuration')
      }
      this.setState({
        error: errorMessage,
        activeRequest: null,
        activeRequestUrl: null
      })
    })

    this.setState({
      activeRequest: {
        abort: function() {
          canceled = true;
        }
      },
      activeRequestMessage: "Uploading style..."
    })
  }

  render() {
    let errorElement;
    if (this.state.error) {
      errorElement = (
        <div className="maputnik-modal-error">
          {this.state.error}
          <a href="#" onClick={() => this.clearError()} className="maputnik-modal-error-close">×</a>
        </div>
      );
    }

    let modalInfoMessage = "";
    if (this.state.activeInfo) {
      modalInfoMessage = this.state.activeInfo.map((text, i) => <p key={i}>{text}</p>);
    }

    return (
      <div>
        <Modal
          data-wd-key="modal:export"
          isOpen={this.props.isOpen}
          onOpenToggle={() => this.onOpenToggle()}
          title={'Upload style & map configuration'}
          className="maputnik-export-modal"
        >
          {errorElement}
          <section className="maputnik-modal-section">
            <h1>Azure Maps - style & map configuration</h1>

            <p>
              Upload current style & map configuration to your Creator's account.
            </p>

            <div>
              <FieldString
                label="Style description"
                fieldSpec={{doc:<p>A user-defined description for this style.</p>}}
                value={this.props.azureMapsExtension.styleDescription}
                onChange={this.onChangeAzureMapsStyleDescription}
              />
              <FieldString
                label="Style alias"
                fieldSpec={{doc:<div><p>An alias that can be used to reference this style. Can contain alphanumeric characters (0-9, a-z, A-Z), hyphen (-) and underscore (_). If empty, this style will need to be referenced by the style ID.</p><p>WARNING! Duplicate aliases are not allowed. If the alias of an existing style is used, that style will be overwritten.</p></div>}}
                value={this.props.azureMapsExtension.styleAlias}
                onChange={this.onChangeAzureMapsStyleAlias}
              />
            </div>

            <div>
              <FieldString
                label="Map configuration description"
                fieldSpec={{doc:<p>A user-defined description for this map configuration.</p>}}
                value={this.props.azureMapsExtension.mapConfigurationDescription}
                onChange={this.onChangeAzureMapsMapConfigurationDescription}
              />
              <FieldString
                label="Map configuration alias"
                fieldSpec={{doc:<div><p>An alias used to reference this map configuration. Can contain alphanumeric characters (0-9, a-z, A-Z), hyphen (-) and underscore (_). If empty, this style will need to be referenced by the map configuration ID.</p><p>WARNING! Duplicate aliases are not allowed. If the alias of an existing map configuration is used, that map configuration will be overwritten.</p></div>}}
                value={this.props.azureMapsExtension.mapConfigurationAlias}
                onChange={this.onChangeAzureMapsMapConfigurationAlias}
              />
            </div>

            <div className="maputnik-modal-export-buttons">
              <InputButton
                onClick={this.onClickUploadAzureMapsMapConfiguration.bind(this)}
              >
                <MdCloudUpload />
                Upload map configuration
              </InputButton>
            </div>
          </section>
        </Modal>

        <ModalLoading
          isOpen={!!this.state.activeRequest}
          title="Uploading..."
          onCancel={(e) => this.onCancelActiveRequest(e)}
          message={this.state.activeRequestMessage}
        />

        <ModalInfo
          isOpen={!!this.state.activeInfo}
          onOpenToggle={() => this.onOpenToggle()}
          title="Upload complete"
          message={modalInfoMessage}
        />

        <ModalPrompt
          isOpen={!!this.state.activePromptCallback}
          onOpenToggle={(decision) => this.state.activePromptCallback(decision)}
          title="Warning"
          message={this.state.activePromptMessage}
        />

      </div>
    )
  }
}

