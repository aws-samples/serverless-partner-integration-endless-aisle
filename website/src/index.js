import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import Context from "./context/Context";
import "bootstrap/dist/css/bootstrap.min.css";
import { Authenticator } from '@aws-amplify/ui-react';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Authenticator.Provider>
      <Context>
        <App />
      </Context>
    </Authenticator.Provider>
  </React.StrictMode>
);