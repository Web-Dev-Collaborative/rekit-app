// This is the root reducer of the feature. It is used for:
//   1. Load reducers from each action in the feature and process them one by one.
//      Note that this part of code is mainly maintained by Rekit, you usually don't need to edit them.
//   2. Write cross-topic reducers. If a reducer is not bound to some specific action.
//      Then it could be written here.
// Learn more from the introduction of this approach:
// https://medium.com/@nate_wang/a-new-approach-for-managing-redux-actions-91c26ce8b5da.

import initialState from './initialState';
import { reducer as fetchInstalledPluginsReducer } from './fetchInstalledPlugins';
import { reducer as enablePluginReducer } from './enablePlugin';
import { reducer as disablePluginReducer } from './disablePlugin';
import { reducer as installPluginReducer } from './installPlugin';
import { reducer as uninstallPluginReducer } from './uninstallPlugin';
import { reducer as fetchOnlinePluginsReducer } from './fetchOnlinePlugins';

import { HOME_GET_MAIN_STATE_SUCCESS } from '../../home/redux/constants';

const reducers = [
  fetchInstalledPluginsReducer,
  enablePluginReducer,
  disablePluginReducer,
  installPluginReducer,
  uninstallPluginReducer,
  fetchOnlinePluginsReducer,
];

export default function reducer(state = initialState, action) {
  let newState;
  switch (action.type) {
    // Handle cross-topic actions here
    case HOME_GET_MAIN_STATE_SUCCESS:
      newState = {
        ...state,
        installing: action.data.installing,
        uninstalling: action.data.uninstalling,
      };
      break;
    default:
      newState = state;
      break;
  }
  return reducers.reduce((s, r) => r(s, action), newState);
}
