import "./App.css";
import Header from "./components/Header";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Cart from "./components/Cart";
import Customer from "./components/Customer";
import Products from "./components/Products";
import Search from "./components/Search";
import Order from "./components/Order";
import { Amplify, Auth } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { Authenticator } from '@aws-amplify/ui-react';
import config from './config';

function App() {
  const amplifyConfig = {
    ...(true || config.userPoolId != null
      ? {
        Auth: {
          region: config.awsRegion,
          userPoolId: config.userPoolId,
          userPoolWebClientId: config.userPoolClientId,
        },
      }
      : {}),
    API: {
      endpoints: [
        {
          name: 'orders',
          endpoint: config.apiEndpoint,
          custom_header: async () => {
            return {
              Authorization: `${(await Auth.currentSession())?.getAccessToken().getJwtToken()}`
            };
          },
        },
        {
          name: 'postorder',
          endpoint: process.env.REACT_APP_API_URL + 'orders',
        },
      ],
    },
  };
  const formFields = {
    signIn: {
      username: {
        labelHidden: false,
        placeholder: 'Enter your username here',
        isRequired: true,
        label: 'Username:'
      },
    },
  }
  Amplify.configure(amplifyConfig);

  return (
    <>
      {/* {authStatus !== 'authenticated' ? <>Please Login!</> : <></>} */}
      <Authenticator hideSignUp={true} formFields={formFields}>
        {({ signOut }) => (
          <>
            <BrowserRouter>
              <Header signOut={signOut} />
              <div className="App">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/orders" element={<Order />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/customer" element={<Customer />} />
                </Routes>
              </div>
            </BrowserRouter>
          </>
        )}
      </Authenticator>
    </>
  );
}

export default App;
