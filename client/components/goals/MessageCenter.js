import React, { Component, PropTypes } from 'react'

class MessageCenter extends Component {
  render() {
    const { data } = this.props
    return (
      <div>
        <h5> This is my Message Center </h5>
      </div>
    )
  }
}

export default MessageCenter