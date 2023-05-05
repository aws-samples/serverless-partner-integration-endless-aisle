import { createContext, useContext, useReducer } from "react";
import { cartReducer, productReducer } from "./Reducers";
import { productDump } from "./productList";
const Cart = createContext();


const Context = ({ children }) => {
  const products = productDump;

  const [state, dispatch] = useReducer(cartReducer, {
    products: products,
    cart: [],
    customerDetails: {
      email: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    }
  });

  const [productState, productDispatch] = useReducer(productReducer, {
    byStock: false,
    byFastDelivery: false,
    byRating: 0,
    searchQuery: "",
    searchSkuQuery: "",
    byPartner: "",
  });


  return (
    <Cart.Provider value={{ state, dispatch, productState, productDispatch }}>
      {children}
    </Cart.Provider>
  );
};

export const CartState = () => {
  return useContext(Cart);
};

export default Context;
