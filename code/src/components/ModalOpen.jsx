import React from 'react'
import PropTypes from 'prop-types'
import ModalLoading from './ModalLoading'
import Modal from './Modal'
import InputButton from './InputButton'
import InputString from './InputString'
import InputSelect from './InputSelect'
import azureMapsExt from '../libs/azure-maps-ext'

export default class ModalOpen extends React.Component {
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
      azMapsKey: props.azureMapsExtension.subscriptionKey,
      azMapsDomain: props.azureMapsExtension.domain,
      azMapsMapConfigurationList: props.azureMapsExtension.mapConfigurationList.mapConfigurations,
      azMapsMapConfigurationListOptions: [],
      azMapsMapConfigurationName: props.azureMapsExtension.mapConfigurationName,
      azMapsMapConfiguration: props.azureMapsExtension.mapConfiguration,
      azMapsStyleTupleIndex: props.azureMapsExtension.styleTupleIndex
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

  onChangeAzureMapsSubscriptionKey = (key) => {
    this.setState({
      azMapsKey: key,
      azMapsMapConfigurationName: "",
      azMapsStyleTupleIndex: ""
    })
  }

  onChangeAzureMapsDomain = (domain) => {
    this.setState({
      azMapsDomain: domain,
      azMapsMapConfigurationName: "",
      azMapsStyleTupleIndex: ""
    })
  }

  onSubmitAzureMapsMapConfigurationList = (e) => {
    e.preventDefault();

    this.clearError();

    let canceled;

    azureMapsExt.listMapConfigurations(this.state.azMapsDomain, this.state.azMapsKey, canceled)
    .then((body) => {
      if(canceled) {
        return;
      }

      this.setState({
        activeRequest: null,
        activeRequestMessage: ""
      });

      const mapConfigurationList = azureMapsExt.ensureMapConfigurationListValidity(body);

      const mapConfigurationListOptions = mapConfigurationList.mapConfigurations.map(mapConfig => {
        return (!mapConfig.alias || mapConfig.alias.startsWith("default")) ? [mapConfig.mapConfigurationId, mapConfig.mapConfigurationId] : [mapConfig.mapConfigurationId, mapConfig.alias];
      });

      const mapConfigurationName = mapConfigurationListOptions.length ? mapConfigurationListOptions[0][0] : "";

      this.setState({
        azMapsMapConfigurationList: mapConfigurationList.mapConfigurations,
        azMapsMapConfigurationListOptions: mapConfigurationListOptions,
        azMapsMapConfigurationName: mapConfigurationName,
        azMapsStyleTupleIndex: ""
      })

      // If there is just a single map configuration then load it automatically
      if (mapConfigurationList.mapConfigurations.length === 1) {
        this.onSubmitAzureMapsMapConfiguration();
      }
    })
    .catch(err => {
      let errorMessage = 'Failed to load Azure Maps map configuration list';
      if (err.response?.error?.message) {
        errorMessage = err.response.error.message;
      }
      if (err.reason === "user") {
        errorMessage = null;
      } else {
        console.error(err)
        console.warn('Could not fetch the map configuration list')
      }
      this.setState({
        error: errorMessage,
        activeRequest: null,
        activeRequestMessage: ""
      })
    })

    this.setState({
      activeRequest: {
        abort: function() {
          canceled = true;
        }
      },
      activeRequestMessage: "Loading: list of Azure Maps map configurations"
    })
  }

  onChangeAzureMapsMapConfigurationName = (mapConfigurationName) => {
    this.setState({
      azMapsMapConfigurationName: mapConfigurationName,
      azMapsStyleTupleIndex: ""
    })
  }

  onSubmitAzureMapsMapConfiguration = (e) => {
    if (e) e.preventDefault();

    this.clearError();

    let canceled;
    let azMapsMapConfiguration = new azureMapsExt.AzureMapsMapConfiguration();

    azureMapsExt.getMapConfiguration(this.state.azMapsDomain, this.state.azMapsMapConfigurationName, this.state.azMapsKey, canceled)
    .then(blob => {
      return azMapsMapConfiguration.load(blob, canceled);
    })
    .then(() => {
      this.setState({
        activeRequest: null,
        activeRequestMessage: ""
      });

      this.setState({
        azMapsMapConfiguration,
        azMapsStyleTupleIndex: "0"
      })

      // If there is just a single style then load it automatically
      if (azMapsMapConfiguration.styles.length === 1) {
        this.onSubmitAzureMapsStyle();
      }
    })
    .catch(err => {
      let errorMessage = 'Failed to load Azure Maps map configuration';
      if (err.response?.error?.message) {
        errorMessage = err.response.error.message;
      }
      if (err.reason === "user") {
        errorMessage = null;
      } else {
        console.error(err)
        console.warn('Could not fetch the map configuration')
      }
      this.setState({
        error: errorMessage,
        activeRequest: null,
        activeRequestMessage: ""
      })
    })

    this.setState({
      activeRequest: {
        abort: function() {
          canceled = true;
        }
      },
      activeRequestMessage: "Loading: map configuration's style + tileset tuples"
    })
  }

  onChangeAzureMapsStyleTupleIndex = (styleTupleIndex) => {
    this.setState({
      azMapsStyleTupleIndex: styleTupleIndex
    })
  }

  onSubmitAzureMapsStyle = (e) => {
    if (e) e.preventDefault();

    this.clearError();

    let canceled;

    this.props.azureMapsExtension.createResultingStyle(
      this.state.azMapsKey,
      this.state.azMapsDomain,
      this.state.azMapsMapConfigurationList,
      this.state.azMapsMapConfigurationName,
      this.state.azMapsMapConfiguration,
      this.state.azMapsStyleTupleIndex,
      canceled)
    .then((resultingStyle) => {
      if(canceled) {
        return;
      }

      this.setState({
        activeRequest: null,
        activeRequestMessage: ""
      });

      this.props.onStyleOpen(resultingStyle)
      this.onOpenToggle()
    })
    .catch(err => {
      let errorMessage = 'Failed to load Azure Maps style';
      if (err.response?.error?.message) {
        errorMessage = err.response.error.message;
      }
      if (err.reason === "user") {
        errorMessage = null;
      } else {
        console.error(err)
        console.warn('Could not create the resulting style to edit')
      }
      this.setState({
        error: errorMessage,
        activeRequest: null,
        activeRequestMessage: ""
      })
    })

    this.setState({
      activeRequest: {
        abort: function() {
          canceled = true;
        }
      },
      activeRequestMessage: "Loading: Azure Maps style elements"
    })
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
          title={'Open style'}
        >
          {errorElement}
          <section className="maputnik-modal-section">
            <h1>Azure Maps styles & map configurations</h1>

            <form onSubmit={this.onSubmitAzureMapsMapConfigurationList}>
              <div className="maputnik-style-gallery-container">
                <p>
                  Enter your Azure Maps subscription key
                </p>
                <InputString
                  aria-label="Azure Maps subscription key for now. RBAC access will be implemented later."
                  data-wd-key="modal:open.azuremaps.subscription_key"
                  type="text"
                  default="Azure Maps subscription key..."
                  value={this.state.azMapsKey}
                  onInput={this.onChangeAzureMapsSubscriptionKey}
                  onChange={this.onChangeAzureMapsSubscriptionKey}
                />

                <p>
                  Select the geography of your Azure Maps Creator resource
                </p>
                <InputSelect
                  aria-label="Azure Maps domain associated with the subscription."
                  data-wd-key="modal:open.azuremaps.domain" 
                  options={this.props.azureMapsExtension.domains}
                  value={this.state.azMapsDomain}
                  onChange={this.onChangeAzureMapsDomain}
                />

                <InputButton
                  data-wd-key="modal:open.azuremaps.get_style_set_list.button"
                  type="submit"
                  className="maputnik-big-button"
                  disabled={this.state.azMapsKey.length < 1}
                >Get map configuration list</InputButton>
              </div>
            </form>

            {this.state.azMapsMapConfigurationName &&
              <form onSubmit={this.onSubmitAzureMapsMapConfiguration}>
                <div className="maputnik-style-gallery-container">
                  <p>
                    Select the map configuration:
                  </p>
                  <InputSelect
                    aria-label="Azure Maps map configuration list."
                    data-wd-key="modal:open.azuremaps.style_set_list" 
                    options={this.state.azMapsMapConfigurationListOptions}
                    value={this.state.azMapsMapConfigurationName}
                    onChange={this.onChangeAzureMapsMapConfigurationName}
                  />

                  <InputButton
                    data-wd-key="modal:open.azuremaps.load_style_set.button"
                    type="submit"
                    className="maputnik-big-button"
                    disabled={!this.state.azMapsMapConfigurationName}
                  >Load map configuration</InputButton>
                </div>
              </form>
            }

            {this.state.azMapsStyleTupleIndex &&
              <form onSubmit={this.onSubmitAzureMapsStyle}>
                <div className="maputnik-style-gallery-container">
                  <p>
                    Select the style + tileset:
                  </p>
                  <InputSelect
                    aria-label="Azure Maps map configuration's style list."
                    data-wd-key="modal:open.azuremaps.style_set_style_list" 
                    options={this.state.azMapsMapConfiguration.styleTuples.map((styleTuple, idx) => [idx, styleTuple] )}
                    value={this.state.azMapsStyleTupleIndex}
                    onChange={this.onChangeAzureMapsStyleTupleIndex}
                  />

                  <InputButton
                    data-wd-key="modal:open.azuremaps.load_style_set_style.button"
                    type="submit"
                    className="maputnik-big-button"
                    disabled={!this.state.azMapsStyleTupleIndex.length}
                  >Load selected style</InputButton>
                </div>
              </form>
            }
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

