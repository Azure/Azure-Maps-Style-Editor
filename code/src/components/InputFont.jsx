import React from 'react'
import PropTypes from 'prop-types'
import InputAutocomplete from './InputAutocomplete'

export default class FieldFont extends React.Component {
  static propTypes = {
    value: PropTypes.array,
    default: PropTypes.array,
    fonts: PropTypes.array,
    style: PropTypes.object,
    onChange: PropTypes.func.isRequired,
    'aria-label': PropTypes.string,
  }

  static defaultProps = {
    fonts: []
  }

  constructor(props) {
    super(props)
    this.state = {
      values: this.props.value || this.props.default || []
    }
  }

  changeFont(idx, newValue) {
    const changedValues = this.state.values.slice(0)
    changedValues[idx] = newValue
    const filteredValues = changedValues
      .filter(v => v !== undefined)
      .filter(v => v !== "")

    if (filteredValues.length) {
      if (this.props.fonts.indexOf(filteredValues[0]) > -1) {
        this.props.onChange(filteredValues);
      }
    }

    this.setState({
      values: changedValues
    })
  }

  render() {
    const inputs = this.state.values.map((value, i) => {
      return <li
        key={i}
      >
        <InputAutocomplete
          aria-label={this.props['aria-label'] || this.props.name}
          value={value}
          options={this.props.fonts.map(f => [f, f])}
          onChange={this.changeFont.bind(this, i)}
        />
      </li>
    })

    return (
      <ul className="maputnik-font">
        {inputs}
      </ul>
    );
  }
}
