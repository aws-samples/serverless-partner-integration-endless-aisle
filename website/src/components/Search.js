import {
  FormControl,
  Navbar,
} from "react-bootstrap";
import { CartState } from "../context/Context";
import "./styles.css";
import SubHeader from "./SubHeader";
import Products from "./Products";


const Search = () => {
  const {
    productDispatch,
  } = CartState();
  return (
    <>
      <SubHeader text={"Search for Products"} />
      <Navbar.Text className="search">
        <FormControl
          style={{ width: 500 }}
          type="search"
          placeholder="Search a product by SKU or Item ID..."
          className="m-auto"
          aria-label="Search"
          onChange={(e) => {
            productDispatch({
              type: "FILTER_BY_SEARCH_SKU",
              payload: e.target.value,
            });
          }}
        />
      </Navbar.Text>
      <Products />
    </>
  );
};

export default Search;
