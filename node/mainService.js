const { ipcMain, BrowserWindow, app } = require('electron');
const promiseIpc = require('electron-promise-ipc');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const axios = require('axios');
const rekitCore = require('rekit-core').core;
const utils = require('./utils');
const studioRunner = require('./studioRunner');
const taskRunner = require('./taskRunner');
const store = require('./store');
const ua = require('./ua');
const logger = require('./logger');

const installing = {};
const uninstalling = {};

// filter recent projects existance
function checkRecent() {
  let recent = store.get('recentProjects') || [];
  recent = recent.filter(dir => fs.existsSync(dir));
  store.set('recentProjects', recent);
}
checkRecent();

const recentProjectsInfoCache = {};

ipcMain.on('call-window-method', (evt, method) => {
  console.log('method');
  switch (method) {
    case 'toggle-maximize':
      utils.toggleWindowMaximize();
      break;
    default:
      break;
  }
});

promiseIpc.on('/start-studio', args => {
  ua.event('rekit-app', 'start-studio').send();
  if (args.restart) {
    taskRunner.stopTask(args.prjDir);
  }
  return studioRunner.startStudio(args.prjDir, args.restart);
});

promiseIpc.on('/get-main-state', prjDir => {
  const studios = studioRunner.getRunningStudios();
  const appTypes = rekitCore.app.getAppTypes();
  return {
    studios: studios.map(s =>
      _.pick(s, ['name', 'port', 'prjDir', 'started', 'error', 'runningScripts', 'gitStatus']),
    ),
    version: app.getVersion(),
    appTypes,
    installing,
    uninstalling,
    recentProjects: (store.get('recentProjects') || []).map(prj => {
      let appType = 'common';
      try {
        appType = require(path.join(prj, 'rekit.json')).appType;
      } catch (err) {}
      const found = _.find(appTypes, { id: appType });
      const logo = (found && found.logo) || null; // eslint-disable-line
      return {
        path: prj,
        logo,
      };
    }),
  };
});

promiseIpc.on('/get-app-types', () => {
  rekitCore.create.syncAppRegistryRepo().then(changed => changed && utils.notifyMainStateChange());
  return rekitCore.app.getAppTypes({ noSync: true });
});

promiseIpc.on('/open-studio', prjDir => {
  // switch to a tab
  const recent = store.get('recentProjects') || [];
  _.pull(recent, prjDir);
  recent.unshift(prjDir);
  if (recent.length > 100) recent.length = 100;
  store.set('recentProjects', recent);
  utils.notifyMainStateChange();
  console.log('open recent', prjDir);
  return true;
});

promiseIpc.on('/close-project', prjDir => {
  ua.event('rekit-app', 'close-project').send();
  // switch to a tab
  return studioRunner.stopStudio(prjDir).then(() => {
    utils.notifyMainStateChange();
  });
});

promiseIpc.on('/create-app', options => {
  ua.event('rekit-app', 'create-app').send();
  rekitCore
    .create({
      ...options,
      status: (code, msg) => {
        console.log(code, msg);
        BrowserWindow.getAllWindows()[0].webContents.send('redux-action', {
          type: 'CREATE_APP_STATUS',
          data: {
            code,
            msg,
          },
        });
      },
    })
    .then(() => {
      BrowserWindow.getAllWindows()[0].webContents.send('redux-action', {
        type: 'CREATE_APP_SUCCESS',
      });
    })
    .catch(err => {
      BrowserWindow.getAllWindows()[0].webContents.send('redux-action', {
        type: 'CREATE_APP_FAILURE',
        data: err,
      });
    });
});

promiseIpc.on('/get-installed-plugins', () => {
  return rekitCore.plugin.getInstalledPlugins(); //.concat(onlinePlugins.data);
});

promiseIpc.on('/get-online-plugins', async () => {
  let onlinePlugins = [];
  try {
    onlinePlugins = await axios.get('https://rekit.github.io/plugin-registry/registry.json');
  } catch (err) {
    logger.info('Failed to get online plugins: ', err);
  }
  return onlinePlugins.data;
});

promiseIpc.on('/install-plugin', name => {
  installing[name] = true;
  return rekitCore.plugin
    .installPlugin(name)
    .then(p => {
      installing[name] = false;
      utils.reduxAction({
        type: 'PLUGIN_MANAGER_INSTALL_PLUGIN_SUCCESS',
        data: p,
      });
      return Promise.resolve(p);
    })
    .catch(err => {
      utils.reduxAction({
        type: 'PLUGIN_MANAGER_INSTALL_PLUGIN_FAILURE',
        data: { name },
      });
    });
});

promiseIpc.on('/uninstall-plugin', name => {
  uninstalling[name] = true;
  return rekitCore.plugin
    .uninstallPlugin(name)
    .then(() => {
      uninstalling[name] = false;
      utils.reduxAction({
        type: 'PLUGIN_MANAGER_UNINSTALL_PLUGIN_SUCCESS',
        data: { name },
      });
      return Promise.resolve();
    })
    .catch(err => {
      utils.reduxAction({
        type: 'PLUGIN_MANAGER_UNINSTALL_PLUGIN_FAILURE',
        data: { name },
      });
    });
});

promiseIpc.on('/disable-plugin', async () => {
  // let onlinePlugins = [];
  // try {
  //   onlinePlugins = await axios.get('https://rekit.github.io/plugin-registry/registry.json');
  // } catch (err) {
  //   logger.info('Failed to get online plugins: ', err);
  // }
  // return onlinePlugins.data;
});
