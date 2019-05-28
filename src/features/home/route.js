import { WelcomePage } from './';

export default {
  path: '/',
  name: 'Home',
  childRoutes: [
    {
      path: 'welcome',
      component: WelcomePage,
      isIndex: true,
    },
  ],
};
