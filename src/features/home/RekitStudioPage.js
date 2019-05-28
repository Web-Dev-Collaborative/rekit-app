import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
// import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Button } from 'antd';
import classnames from 'classnames';
import history from '../../common/history';
import { WebView } from '../common';
import rekitLogo from '../../images/rekit-logo.svg';
import utils from './utils';

export class RekitStudioPage extends Component {
  static propTypes = {
    match: PropTypes.object,
    studios: PropTypes.array.isRequired,
    studioById: PropTypes.object.isRequired,
  };

  static defaultProps = {
    match: null,
  }

  constructor(props) {
    super(props);
    this.loadingTimeout = {};
  }
  state = {
    loaded: {},
    closing: {},
    match: null,
  };

  static getDerivedStateFromProps(props) {
    if (props.match) return { match: props.match };
    return null;
  }
  componentDidMount() {
    window.bridge.ipcRenderer.on('close-project', this.handleCloseProject);
    window.bridge.ipcRenderer.on('restart-project', this.handleRestartProject);
  }
  componentWillUnmount() {
    window.bridge.ipcRenderer.removeListener('close-project', this.handleCloseProject);
    window.bridge.ipcRenderer.removeListener('restart-project', this.handleRestartProject);
  }

  handleRestartProject = () => {
    const { port } = this.state.match.params;
    const { studioById } = this.props;
    const studio = _.find(Object.values(studioById), { port });
    this.setState({
      loaded: {
        ...this.state.loaded,
        [studio.prjDir]: false,
      },
    });
    utils.openProject(studio.prjDir, true);
  };

  handleCloseProject = () => {
    const { port } = this.state.match.params;
    const { studios, studioById } = this.props;
    const studio = _.find(Object.values(this.props.studioById), { port });
    this.setState({
      closing: {
        ...this.state.closing,
        [studio.prjDir]: true,
      },
    });
    window.bridge.promiseIpc.send('/close-project', studio.prjDir).then(() => {
      this.setState({
        closing: {
          ...this.state.closing,
          [studio.prjDir]: false,
        },
      });
      const list = _.without(studios, studio.prjDir);
      if (list.length === 0) history.push('/');
      else history.push(`/rekit-studio/${studioById[list[0]].port}`);
    });
  };

  handleWebViewOnload = prjDir => {
    if (this.loadingTimeout[prjDir]) {
      clearTimeout(this.loadingTimeout[prjDir]);
      delete this.loadingTimeout[prjDir];
    }
    setTimeout(
      () =>
        this.setState({
          loaded: {
            ...this.state.loaded,
            [prjDir]: true,
          },
        }),
      800,
    );
  };

  renderLoadingStatus(studio) {
    const prjDir = studio.prjDir;
    let text = '';
    if (!studio.started) text = 'Starting Rekit Studio...';
    else {
      text = 'Loading the project...';
      if (!this.loadingTimeout[prjDir]) {
        this.loadingTimeout[prjDir] = window.setTimeout(
          () => this.handleWebViewOnload(prjDir),
          2000,
        );
      }
    }
    return (
      <div className="loading-status">
        <div className="center-block">
          <img src={rekitLogo} alt="rekit-logo" />
          <p>{text}</p>
        </div>
      </div>
    );
  }

  renderErrorMessage(studio) {
    return (
      <div className="error-message">
        <div className="center-block">
          <h2>Fatal: Rekit Studio failed to load the project: {studio.prjDir}</h2>
          <ul>
            {studio.error.split(/\n/g).map(s => (
              <li>{s}</li>
            ))}
          </ul>
          <div className="buttons">
            <Button type="primary" onClick={() => utils.openProject(studio.prjDir, true)}>
              Reload
            </Button>
            <Button className="btn-close" onClick={this.handleCloseProject}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  renderWebView = id => {
    const studio = this.props.studioById[id];
    const { port } = this.state.match.params;
    return studio.started ? (
      <WebView
        key={studio.port}
        src={`http://localhost:${studio.port}`}
        visible={studio.port === port}
        onload={() => this.handleWebViewOnload(studio.prjDir)}
      />
    ) : null;
  };

  renderWebViews() {
    return <div className="wv-container">{this.props.studios.map(this.renderWebView)}</div>;
  }

  renderNotFound(port) {
    return <div className="not-found">Project not found: {port}.</div>;
  }

  render() {
    if (!this.state.match) return null;
    const { port } = this.state.match.params;
    const currentStudio = _.find(Object.values(this.props.studioById), {
      port,
    });

    return (
      <div className={classnames('home-rekit-studio-page', { hidden: !this.props.match })}>
        {this.renderWebViews()}
        {currentStudio &&
          !currentStudio.error &&
          (!currentStudio.started || !this.state.loaded[currentStudio.prjDir]) &&
          this.renderLoadingStatus(currentStudio)}
        {!currentStudio && this.renderNotFound(port)}
        {currentStudio && currentStudio.error && this.renderErrorMessage(currentStudio)}
      </div>
    );
  }
}

/* istanbul ignore next */
function mapStateToProps(state) {
  return {
    home: state.home,
    studios: state.home.studios,
    studioById: state.home.studioById,
  };
}

/* istanbul ignore next */
// function mapDispatchToProps(dispatch) {
//   return {
//     actions: bindActionCreators({ ...actions }, dispatch),
//   };
// }

export default connect(
  mapStateToProps,
  // mapDispatchToProps,
)(RekitStudioPage);
