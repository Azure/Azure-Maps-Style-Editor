import React from 'react'
import PropTypes from 'prop-types'
import FieldString from './FieldString'
import InputButton from './InputButton'
import ModalLoading from './ModalLoading'
import ModalInfo from './ModalInfo'
import ModalPrompt from './ModalPrompt'
import Modal from './Modal'
import { MdCloudUpload } from 'react-icons/md'
import FieldCheckbox from './FieldCheckbox'

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
      styleDescription: this.props.styleDescription,
      mapConfigurationDescription: this.props.mapConfigurationDescription,
      mapConfigurationAlias: this.props.mapConfigurationAlias,
      styleDescriptionError: "",
      mapConfigurationDescriptionError: "",
      mapConfigurationAliasError: "",
      deleteExistingMapConfig: true,
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.mapConfigurationAlias !== this.props.mapConfigurationAlias) {
      this.setState({
        mapConfigurationAlias: this.props.mapConfigurationAlias,
      });
    }
    if (prevProps.mapConfigurationDescription !== this.props.mapConfigurationDescription) {
      this.setState({
        mapConfigurationDescription: this.props.mapConfigurationDescription,
      });
    }
    if (prevProps.styleDescription !== this.props.styleDescription) {
      this.setState({
        styleDescription: this.props.styleDescription,
      });
    }
  }

  toggleDeleteExistingMapConfig() {
    this.setState({
      deleteExistingMapConfig: !this.state.deleteExistingMapConfig,
    }, () => {
      this.setState({
        mapConfigurationAliasError: this.checkAliasString(this.state.mapConfigurationAlias),
      });
    });
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

  checkStringForLength = (inputString) => {
    if (inputString.length > 1000) {
      return "too long - max 1000 characters";
    }
    return "";
  }

  checkDescriptionString = (inputString) => {
    return this.checkStringForLength(inputString);
  }

  checkAliasString = (inputString = '') => {
    let result = this.checkStringForLength(inputString);
    if (result) return result;
    if (this.isAliasAlreadyExists(inputString)) {
      return 'alias already exists.';
    }
    if (/[^0-9a-zA-Z-_]/.test(inputString)) {
      return "contains invalid characters";
    }
    return "";
  }

  isAliasAlreadyExists = (alias) => {
    const existingMapConfigs = this.props.azureMapsExtension.mapConfigurationList.filter((config) => {
      if (config.mapConfigurationId === this.props.azureMapsExtension.mapConfigurationName && this.state.deleteExistingMapConfig) {
        return false;
      }
      return config.alias === alias;
    });
    return existingMapConfigs.length > 0;
  }

  onChangeAzureMapsStyleDescription = (styleDescription) => {
    this.setState({
      styleDescription,
      styleDescriptionError: this.checkDescriptionString(styleDescription)
    });
  }

  onChangeAzureMapsMapConfigurationDescription = (mapConfigurationDescription) => {
    this.setState({
      mapConfigurationDescription,
      mapConfigurationDescriptionError: this.checkDescriptionString(mapConfigurationDescription)
    });
  }

  onChangeAzureMapsMapConfigurationAlias = (mapConfigurationAlias) => {
    this.setState({
      mapConfigurationAlias,
      mapConfigurationAliasError: this.checkAliasString(mapConfigurationAlias)
    });
  }

  onClickUploadAzureMapsMapConfiguration = (e) => {
    e.preventDefault();

    const anyAliasOrDescriptionError = !!this.state.styleDescriptionError || !!this.state.mapConfigurationDescriptionError || !!this.state.mapConfigurationAliasError;
    if (anyAliasOrDescriptionError) {
      return;
    }

    this.clearError();

    this.props.azureMapsExtension.getMapConfigurationId(this.state.mapConfigurationAlias)
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
            activePromptMessage: `Map Configuration ID ${mapConfigurationId} will be deleted. Map Configuration Alias ${this.state.mapConfigurationAlias} will point to the newly saved Map Configuration.`
          });
        } else {
          this.uploadAzureMapsMapConfiguration();
        }
      });
  }

  uploadAzureMapsMapConfiguration = () => {
    let canceled;
    let resultingStyleId;

    this.props.azureMapsExtension.uploadResultingStyle(this.props.mapStyle, canceled, this.state.styleDescription)
    .then(styleId => {
      if(canceled) {
        return;
      }

      this.setState({
        activeRequestMessage: "Successfully uploaded style! Uploading map configuration..."
      });

      resultingStyleId = styleId;
      return this.props.azureMapsExtension.uploadResultingMapConfiguration(styleId, canceled, this.state.mapConfigurationAlias, this.state.mapConfigurationDescription, this.state.deleteExistingMapConfig);
    })
    .then(mapConfigurationId => {
      if(canceled) {
        return;
      }

      this.setState({
        activeInfo: ["Success!", "Style ID: "+resultingStyleId, "Map configuration ID: "+mapConfigurationId, "Map configuration alias: "+this.state.mapConfigurationAlias],
        activeRequest: null,
        activeRequestMessage: ""
      });
      this.props.onSuccess(mapConfigurationId, this.state.mapConfigurationAlias, this.state.mapConfigurationDescription, this.state.styleDescription);
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
    const anyError = !!this.state.error || !!this.state.styleDescriptionError || !!this.state.mapConfigurationDescriptionError || !!this.state.mapConfigurationAliasError;

    let otherErrorElement;
    if (this.state.error) {
      otherErrorElement = (
        <div>
          {this.state.error}<br />
        </div>
      )
    }
    let styleDescriptionErrorElement;
    if (this.state.styleDescriptionError) {
      styleDescriptionErrorElement = (
        <div>
          Style description: {this.state.styleDescriptionError}<br />
        </div>
      )
    }
    let mapConfigurationDescriptionErrorElement;
    if (this.state.mapConfigurationDescriptionError) {
      mapConfigurationDescriptionErrorElement = (
        <div>
          Map configuration description: {this.state.mapConfigurationDescriptionError}<br />
        </div>
      )
    }
    let mapConfigurationAliasErrorElement;
    if (this.state.mapConfigurationAliasError) {
      mapConfigurationAliasErrorElement = (
        <div>
          Map configuration alias: {this.state.mapConfigurationAliasError}<br />
        </div>
      )
    }

    let errorElement;
    if (anyError) {
      errorElement = (
        <div className="maputnik-modal-error">
          {otherErrorElement}
          {styleDescriptionErrorElement}
          {mapConfigurationDescriptionErrorElement}
          {mapConfigurationAliasErrorElement}
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
                value={this.state.styleDescription}
                onChange={this.onChangeAzureMapsStyleDescription}
                error={this.state.styleDescriptionError}
              />
            </div>

            <div>
              <FieldString
                label="Map configuration description"
                fieldSpec={{doc:<p>A user-defined description for this map configuration.</p>}}
                value={this.state.mapConfigurationDescription}
                onChange={this.onChangeAzureMapsMapConfigurationDescription}
                error={this.state.mapConfigurationDescriptionError}
              />
              <FieldString
                label="Map configuration alias"
                fieldSpec={{doc:<div><p>An alias used to reference this map configuration. Can contain alphanumeric characters (0-9, a-z, A-Z), hyphen (-) and underscore (_). If empty, this map configuration will need to be referenced by the map configuration ID.</p><p>WARNING! Duplicate aliases are not allowed. If the alias of an existing map configuration is used, that map configuration will be overwritten.</p></div>}}
                value={this.state.mapConfigurationAlias}
                onChange={this.onChangeAzureMapsMapConfigurationAlias}
                error={this.state.mapConfigurationAliasError}
              />
            </div>
            <FieldCheckbox
              label={`Delete existing map configuration Id: ${this.props.azureMapsExtension.mapConfigurationName}`}
              value={this.state.deleteExistingMapConfig}
              onChange={this.toggleDeleteExistingMapConfig.bind(this)}
            />
            <div className="maputnik-modal-export-buttons">
              <InputButton
                onClick={this.onClickUploadAzureMapsMapConfiguration.bind(this)}
                disabled={anyError}
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

