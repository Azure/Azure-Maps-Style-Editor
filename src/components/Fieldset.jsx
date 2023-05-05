import React from 'react'
import FieldDocLabel from './FieldDocLabel'
import Doc from './Doc'


let IDX = 0;

export default class Fieldset extends React.Component {
  constructor (props) {
    super(props);
    this._labelId = `fieldset_label_${(IDX++)}`;
    this.state = {
      showDoc: false,
    }
  }

  onToggleDoc = (val) => {
    this.setState({
      showDoc: val
    });
  }

  render () {
    return <div className="maputnik-input-block" role="group" aria-labelledby={this._labelId}>
      {this.props.fieldSpec &&
        <div className="maputnik-input-block-label">
          <FieldDocLabel
            label={this.props.label}
            doc={this.props.fieldSpec.doc}
            onToggleDoc={this.onToggleDoc}
          />
        </div>
      }
      {!this.props.fieldSpec &&
        <div className="maputnik-input-block-label">
          {this.props.label}
        </div>
      }
      <div className="maputnik-input-block-action">
        {this.props.action}
      </div>
      <div className="maputnik-input-block-content">
        {this.props.children}
      </div>
      {this.props.fieldSpec &&
        <div
          className="maputnik-doc-inline"
          style={{display: this.state.showDoc ? '' : 'none'}}
        >
          <Doc fieldSpec={this.props.fieldSpec} />
        </div>
      }
    </div>
  }
}
