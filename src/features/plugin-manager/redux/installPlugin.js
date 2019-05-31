import _ from 'lodash';
import {
  PLUGIN_MANAGER_INSTALL_PLUGIN_BEGIN,
  PLUGIN_MANAGER_INSTALL_PLUGIN_SUCCESS,
  PLUGIN_MANAGER_INSTALL_PLUGIN_FAILURE,
  PLUGIN_MANAGER_INSTALL_PLUGIN_DISMISS_ERROR,
} from './constants';

// Rekit uses redux-thunk for async actions by default: https://github.com/gaearon/redux-thunk
// If you prefer redux-saga, you can use rekit-plugin-redux-saga: https://github.com/supnate/rekit-plugin-redux-saga
export function installPlugin(name) {
  return dispatch => {
    // optionally you can have getState as the second argument
    dispatch({
      type: PLUGIN_MANAGER_INSTALL_PLUGIN_BEGIN,
      data: { name },
    });

    // Return a promise so that you could control UI flow without states in the store.
    // For example: after submit a form, you need to redirect the page to another when succeeds or show some errors message if fails.
    // It's hard to use state to manage it, but returning a promise allows you to easily achieve it.
    // e.g.: handleSubmit() { this.props.actions.submitForm(data).then(()=> {}).catch(() => {}); }
    const promise = new Promise((resolve, reject) => {
      // doRequest is a placeholder Promise. You should replace it with your own logic.
      // See the real-word example at:  https://github.com/supnate/rekit/blob/master/src/features/home/redux/fetchRedditReactjsList.js
      // args.error here is only for test coverage purpose.
      const doRequest = window.bridge.promiseIpc.send('/install-plugin', name);
      doRequest.then(
        res => {
          dispatch({
            type: PLUGIN_MANAGER_INSTALL_PLUGIN_SUCCESS,
            data: res,
          });
          resolve(res);
        },
        // Use rejectHandler as the second argument so that render errors won't be caught.
        err => {
          dispatch({
            type: PLUGIN_MANAGER_INSTALL_PLUGIN_FAILURE,
            data: { error: err },
          });
          reject(err);
        },
      );
    });

    return promise;
  };
}

// Async action saves request error by default, this method is used to dismiss the error info.
// If you don't want errors to be saved in Redux store, just ignore this method.
export function dismissInstallPluginError() {
  return {
    type: PLUGIN_MANAGER_INSTALL_PLUGIN_DISMISS_ERROR,
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case PLUGIN_MANAGER_INSTALL_PLUGIN_BEGIN:
      // Just after a request is sent
      return {
        ...state,
        installing: {
          ...state.installing,
          [action.data.name]: true,
        },
        installPluginPending: true,
        installPluginError: null,
      };

    case PLUGIN_MANAGER_INSTALL_PLUGIN_SUCCESS: {
      const name = action.data.name;
      const found = _.find(state.plugins, { name });
      let newPlugins = [...state.plugins];
      if (found) {
        newPlugins = newPlugins.map(p => (p === found ? Object.assign({}, found, action.data) : p));
      } else {
        newPlugins.push(action.data);
      }

      // The request is success
      return {
        ...state,
        installing: {
          ...state.installing,
          [action.data.name]: false,
        },
        plugins: newPlugins,
        installPluginPending: false,
        installPluginError: null,
      };
    }

    case PLUGIN_MANAGER_INSTALL_PLUGIN_FAILURE:
      // The request is failed
      return {
        ...state,
        installPluginPending: false,
        installPluginError: action.data.error,
      };

    case PLUGIN_MANAGER_INSTALL_PLUGIN_DISMISS_ERROR:
      // Dismiss the request failure error
      return {
        ...state,
        installPluginError: null,
      };

    default:
      return state;
  }
}
