import React from 'react';

import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';

// custom spinner component
import Spinner from '@components/common/spinner';
// pages
import About from '@pages/about';
import Dashboard from '@pages/dashboard';
import Home from '@pages/home';
import MainPage from '@pages/main';

// css module
import styles from './App.module.scss';

// app router
const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "main",
        element: <MainPage />,
      },
    ],
  },
]);

// react functional component
export default function App() {
  return (<div className={styles.App}>
    <RouterProvider
      router={router}
      fallbackElement={<Spinner size={100} />}
    />
  </div>);
}
