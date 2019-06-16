/* eslint jsx-a11y/alt-text:0 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Row, Col, Button, Menu, Dropdown, Icon } from 'antd';
import history from '../../common/history';
import {
  fetchInstalledPlugins,
  fetchOnlinePlugins,
  installPlugin,
  uninstallPlugin,
} from './redux/actions';
import { PluginIcon, InstallButton } from './';

export class PluginList extends Component {
  static propTypes = {
    pluginManager: PropTypes.object.isRequired,
    installing: PropTypes.object.isRequired,
    uninstalling: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
  };

  componentDidMount() {
    this.props.actions.fetchInstalledPlugins();
    this.props.actions.fetchOnlinePlugins();
  }

  getPlugins() {
    const { plugins, onlinePlugins } = this.props.pluginManager;
    const merged = [...plugins].filter(p => !!p.version);
    const byName = merged.reduce((p, c) => {
      p[c.name] = c;
      return p;
    }, {});
    onlinePlugins.forEach(p => {
      if (byName[p.name]) {
        //installed
        byName[p.name].latestVersion = p;
      } else {
        p.__notInstalled = true;
        merged.push(p);
      }
    });
    return merged;
  }

  renderItem = item => {
    return (
      <li
        key={item.name}
        onClick={() => history.push(`/plugins/${item.name}`)}
        className={classnames({ selected: item.name === this.props.current })}
      >
        <PluginIcon item={item} />
        <label className="name">{item.name}</label>
        <label className="version">{item.version || ''}</label>
        <p>{item.description || 'No description.'}</p>
        <Row className="footer">
          <Col span={16}>
            <label className="author">{item.author}</label>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <InstallButton item={item} />
          </Col>
        </Row>
      </li>
    );
  };

  renderInstallButton(item) {
    const { installing, uninstalling } = this.props;
    if (installing[item.name]) {
      return (
        <span className="status-installing">
          <Icon type="loading-3-quarters" spin />
          Installing...
        </span>
      );
    }
    if (uninstalling[item.name]) {
      return (
        <span className="status-uninstalling">
          <Icon type="loading-3-quarters" spin />
          Removing...
        </span>
      );
    }
    if (item.__notInstalled)
      return (
        <Button size="small" onClick={() => this.handleInstall(item)}>
          Install
        </Button>
      );
    if (!item.latestVersion || item.latestVersion.versoin !== item.version) {
      const needUpdate = item.latestVersion && item.latestVersion.versoin !== item.version;
      const menu = (
        <Menu onClick={evt => this.handleMenuClick(evt, item)}>
          {needUpdate && <Menu.Item key="update">Update</Menu.Item>}
          <Menu.Item key="remove">Remove</Menu.Item>
        </Menu>
      );
      return (
        <Dropdown overlay={menu}>
          <Button
            size="small"
            className={classnames('btn-installed', { 'btn-to-update': needUpdate })}
          >
            {needUpdate ? 'Update' : 'Installed'} <Icon type="down" />
          </Button>
        </Dropdown>
      );
    }
  }

  renderLoading() {
    return <div className="plugin-manager-plugin-list plugins-loading">Loading...</div>;
  }

  render() {
    return (
      <div className="plugin-manager-plugin-list">
        <ul>{this.getPlugins().map(this.renderItem)}</ul>
      </div>
    );
  }
}

/* istanbul ignore next */
function mapStateToProps(state) {
  return {
    pluginManager: state.pluginManager,
    installing: state.pluginManager.installing,
    uninstalling: state.pluginManager.uninstalling,
  };
}

/* istanbul ignore next */
function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(
      { fetchInstalledPlugins, fetchOnlinePlugins, installPlugin, uninstallPlugin },
      dispatch,
    ),
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PluginList);
