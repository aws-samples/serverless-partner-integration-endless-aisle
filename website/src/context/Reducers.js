export const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_TO_CART":
      return { ...state, cart: [...state.cart, { ...action.payload, qty: 1 }] };
    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter((c) => c.itemId !== action.payload.itemId),
      };
    case "CHANGE_CART_QTY":
      return {
        ...state,
        cart: state.cart.filter((c) =>
          c.itemId === action.payload.itemId ? (c.qty = action.payload.qty) : c.qty
        ),
      };
    case "ADD_CUSTOMER_DETAILS_EMAIL":
      return {
        ...state,
        customerDetails: { ...state.customerDetails, email: action.payload }
      };
    case "ADD_CUSTOMER_DETAILS_ADDRESS":
      return {
        ...state,
        customerDetails: { ...state.customerDetails, address: action.payload }
      };
    case "ADD_CUSTOMER_DETAILS_CITY":
      return {
        ...state,
        customerDetails: { ...state.customerDetails, city: action.payload }
      };
    case "ADD_CUSTOMER_DETAILS_STATE":
      return {
        ...state,
        customerDetails: { ...state.customerDetails, state: action.payload }
      };
    case "ADD_CUSTOMER_DETAILS_POSTALCODE":
      return {
        ...state,
        customerDetails: { ...state.customerDetails, postalCode: action.payload }
      };
    case "ADD_CUSTOMER_DETAILS_COUNTRY":
      return {
        ...state,
        customerDetails: { ...state.customerDetails, country: action.payload }
      };
    case "CLEAR_CART":
      return {
        ...state, cart: [], customerDetails: {
          email: '',
          address: '',
          city: '',
          state: '',
          postalCode: '',
          country: ''
        }
      };
    default:
      return state;
  }
};

export const productReducer = (state, action) => {
  switch (action.type) {
    case "SORT_BY_PRICE":
      return { ...state, sort: action.payload };
    case "FILTER_BY_STOCK":
      return { ...state, byStock: !state.byStock };
    case "FILTER_BY_DELIVERY":
      return { ...state, byFastDelivery: !state.byFastDelivery };
    case "FILTER_BY_RATING":
      return { ...state, byRating: action.payload };
    case "FILTER_BY_PARTNER":
      return { ...state, byPartner: action.payload };
    case "FILTER_BY_SEARCH":
      return { ...state, searchQuery: action.payload };
    case "FILTER_BY_SEARCH_SKU":
      return { ...state, searchSkuQuery: action.payload };
    case "LOOKUP_ORDER":
      return { ...state, searchOrderQuery: action.payload };
    case "CLEAR_FILTERS":
      return { byStock: false, byFastDelivery: false, byRating: 0 };
    default:
      return state;
  }
};