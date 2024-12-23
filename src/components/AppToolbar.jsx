import React from 'react'
import PropTypes from 'prop-types'

import {MdOpenInBrowser, MdSave, MdLayers, MdErrorOutline} from 'react-icons/md'

import logoImage from 'maputnik-design/logos/logo-color.svg'
import pkgJson from '../../package.json'
import { deprecations } from 'sass'

class IconText extends React.Component {
  static propTypes = {
    children: PropTypes.node,
  }

  render() {
    return <span className="maputnik-icon-text">{this.props.children}</span>
  }
}

class ToolbarSelect extends React.Component {
  static propTypes = {
    children: PropTypes.node,
    wdKey: PropTypes.string
  }

  render() {
    return <div
      className='maputnik-toolbar-select'
      data-wd-key={this.props.wdKey}
    >
      {this.props.children}
    </div>
  }
}

class ToolbarAction extends React.Component {
  static propTypes = {
    children: PropTypes.node,
    onClick: PropTypes.func,
    wdKey: PropTypes.string
  }

  render() {
    return <button
      className='maputnik-toolbar-action'
      data-wd-key={this.props.wdKey}
      onClick={this.props.onClick}
    >
      {this.props.children}
    </button>
  }
}

export default class AppToolbar extends React.Component {
  static propTypes = {
    mapData: PropTypes.object.isRequired,
    mapStyle: PropTypes.object.isRequired,
    inspectModeEnabled: PropTypes.bool.isRequired,
    onStyleChanged: PropTypes.func.isRequired,
    // A new style has been uploaded
    onStyleOpen: PropTypes.func.isRequired,
    // A dict of source id's and the available source layers
    sources: PropTypes.object.isRequired,
    children: PropTypes.node,
    onToggleModal: PropTypes.func,
    onSetMapState: PropTypes.func,
    mapState: PropTypes.string,
    renderer: PropTypes.string,
  }

  state = {
    isOpen: {
      settings: false,
      sources: false,
      open: false,
      deprecation: false,
      add: false,
      export: false,
    }
  }

  selectBaseMap(val) {
    this.props.onSetBaseMap(val);
  }

  onSkip = (target) => {
    if (target === "map") {
      document.querySelector(".mapboxgl-canvas").focus();
    }
    else {
      const el = document.querySelector("#skip-target-"+target);
      el.focus();
    }
  }

  render() {
    const baseMaps = [
      {
        id: "blank",
        title: "No base map (blank)",
      },
      {
        id: "microsoft_light",
        title: "Microsoft light (road)",
      },
      {
        id: "microsoft_dark",
        title: "Microsoft dark (night)",
      },
      {
        id: "microsoft_grayscale_light",
        title: "Microsoft grayscale light",
      },
      {
        id: "microsoft_grayscale_dark",
        title: "Microsoft grayscale dark",
      },
      {
        id: "microsoft_shaded_relief",
        title: "Microsoft light (road_shaded_relief)",
      },
      {
        id: "microsoft_high_contrast_light",
        title: "Microsoft high contrast light",
      },
      {
        id: "microsoft_high_contrast_dark",
        title: "Microsoft high contrast dark",
      },
      {
        id: "microsoft_satellite",
        title: "Microsoft satellite",
      },
      {
        id: "microsoft_satellite_road",
        title: "Microsoft satellite with road labels",
      },
    ];

    const currentBaseMap = baseMaps.find(baseMap => {
      return baseMap.id === this.props.baseMap;
    });

    return <nav className='maputnik-toolbar'>
      <div className="maputnik-toolbar__inner">
        <div
          className="maputnik-toolbar-logo-container"
        >
          {/* Keyboard accessible quick links */}
          <button
            data-wd-key="root:skip:layer-list"
            className="maputnik-toolbar-skip"
            onClick={e => this.onSkip("layer-list")}
          >
            Layers list
          </button>
          <button
            data-wd-key="root:skip:layer-editor"
            className="maputnik-toolbar-skip"
            onClick={e => this.onSkip("layer-editor")}
          >
            Layer editor
          </button>
          <button
            data-wd-key="root:skip:map-view"
            className="maputnik-toolbar-skip"
            onClick={e => this.onSkip("map")}
          >
            Map view
          </button>
          <a
            className="maputnik-toolbar-logo"
            target="blank"
            rel="noreferrer noopener"
            href="https://github.com/azure/Azure-Maps-Style-Editor"
          >
            <span dangerouslySetInnerHTML={{__html: logoImage}} />
            <h1>
              <span className="maputnik-toolbar-name">{pkgJson.name}</span>
              <span className="maputnik-toolbar-version">v{pkgJson.version}</span>
            </h1>
          </a>
        </div>
        <div className="maputnik-toolbar__actions" role="navigation" aria-label="Toolbar">
          <ToolbarAction wdKey="nav:open" onClick={this.props.onToggleModal.bind(this, 'open')}>
            <MdOpenInBrowser />
            <IconText>Open</IconText>
          </ToolbarAction>
          <ToolbarAction wdKey="nav:export" onClick={this.props.onToggleModal.bind(this, 'export')}>
            <MdSave />
            <IconText>Save</IconText>
          </ToolbarAction>
          <ToolbarSelect wdKey="nav:inspect">
            <MdLayers />
            <label>Base map
              <select
                className="maputnik-select"
                onChange={(e) => this.selectBaseMap(e.target.value)}
                value={currentBaseMap.id}
              >
                {baseMaps.map(item => {
                  return (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  );
                })}
              </select>
            </label>
          </ToolbarSelect>
        </div>
        <div className="maputnik-toolbar-info">
          <div className="maputnik-toolbar-info-map-config-container">
            {this.props.mapData.mapId && <span>Map Configuration ID   : {this.props.mapData.mapId}</span>}
            {this.props.mapData.alias && <span>Map Configuration Alias: {this.props.mapData.alias}</span>}
          </div>
          {this.props.mapData.styleName && <div>Style: {this.props.mapData.styleName}</div>}
        </div>
      </div>
      <div className="maputnik-toolbar__inner" style={{paddingLeft:"10px"}}>
        <p style={{fontSize:"16px", color:"#D9534F"}}><MdErrorOutline /> Note: The Azure Maps Creator indoor map service is now deprecated and will be retired on 9/30/25. For more information, see&nbsp;
          <a href='https://aka.ms/AzureMapsCreatorDeprecation'
            style={{color:"#D9534F", fontWeight:"bold"}}>
            End of Life Announcement of Azure Maps Creator.
          </a>
        </p>
      </div>
    </nav>
  }
}
