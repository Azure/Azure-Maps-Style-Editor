import React from 'react'
import PropTypes from 'prop-types'

import FieldFunction from './FieldFunction'
const iconProperties = ['background-pattern', 'fill-pattern', 'line-pattern', 'fill-extrusion-pattern', 'icon-image']

/** Extract field spec by {@fieldName} from the {@layerType} in the
 * style specification from either the paint or layout group */
function getFieldSpec(spec, layerType, fieldName) {
  const groupName = getGroupName(spec, layerType, fieldName)
  const group = spec[groupName + '_' + layerType]
  const fieldSpec = group[fieldName]
  if(iconProperties.indexOf(fieldName) >= 0) {
    return {
      ...fieldSpec,
      values: spec.$root.sprite.values
    }
  }
  if(fieldName === 'text-font') {
    return {
      ...fieldSpec,
      values: spec.$root.glyphs.values
    }
  }
  return fieldSpec
}

function getGroupName(spec, layerType, fieldName) {
  const paint  = spec['paint_' + layerType] || {}
  if (fieldName in paint) {
    return 'paint'
  } else {
    return 'layout'
  }
}

export default class PropertyGroup extends React.Component {
  static propTypes = {
    layer: PropTypes.object.isRequired,
    groupFields: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    spec: PropTypes.object.isRequired,
    errors: PropTypes.object,
  }

  onPropertyChange = (property, newValue) => {
    const group = getGroupName(this.props.spec, this.props.layer.type, property)
    this.props.onChange(group , property, newValue)
  }

  onConvertedColorPropertyChange = (property, newValue) => {
    const group = getGroupName(this.props.spec, this.props.layer.type, property)
    this.props.onChange(group , property, convertStringColorToExpression(newValue))
  }

  render() {
    const {errors} = this.props;
    const fields = this.props.groupFields.map(fieldName => {
      const fieldSpec = getFieldSpec(this.props.spec, this.props.layer.type, fieldName)

      const paint = this.props.layer.paint || {}
      const layout = this.props.layer.layout || {}
      const fieldValue = fieldName in paint ? paint[fieldName] : layout[fieldName]
      const fieldType = fieldName in paint ? 'paint' : 'layout';

      const convertedFieldValue = isValueAColorExpression(fieldValue) ? fieldValue[2] : fieldValue;
      const onChangeCallback = isValueAColorExpression(fieldValue) ? this.onConvertedColorPropertyChange : this.onPropertyChange;

      return <FieldFunction
        errors={errors}
        onChange={onChangeCallback}
        key={fieldName}
        fieldName={fieldName}
        value={convertedFieldValue}
        fieldType={fieldType}
        fieldSpec={fieldSpec}
      />
    })

    return <div className="maputnik-property-group">
      {fields}
    </div>
  }
}

// checks if it is a color expression, like
// [
//   "string",
//   ["feature-state", "color"],
//   "rgba(255, 255, 255, 1)"
// ]
function isValueAColorExpression(value) {
  return Array.isArray(value) && value.length === 3 && value[0] === 'string' && Array.isArray(value[1])
    && value[1][0] === 'feature-state' && value[1][1] === 'color' && typeof value[2] === 'string';
}

function convertStringColorToExpression(colorString) {
  if (typeof colorString !== 'string') {
    return colorString;
  }
  return [
    'string',
    ['feature-state', 'color'],
    colorString,
  ];
}