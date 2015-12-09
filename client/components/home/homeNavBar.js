import React, { Component, PropTypes } from 'react'
import FlatButton from 'material-ui/lib/flat-button'
import AppBar from 'material-ui/lib/app-bar'
import IconButton from 'material-ui/lib/icon-button'
import IconMenu from 'material-ui/lib/menus/icon-menu'
import MenuItem from 'material-ui/lib/menus/menu-item'
import NavigationClose from 'material-ui/lib/svg-icons/navigation/close'
import MoreVertIcon from 'material-ui/lib/svg-icons/navigation/more-vert'
import { Link } from 'react-router'

class HomeNavBar extends Component {
  render() {
    return (
      <div>
        <AppBar 
          title="Dashboard" 
          iconElementRight={
            <IconMenu iconButtonElement={
              <IconButton><MoreVertIcon /></IconButton>
            }>
              <MenuItem primaryText="Settings" />
              <MenuItem primaryText="Sign out" />
            </IconMenu>
          } />
      </div>
    )
  }
}

export default HomeNavBar