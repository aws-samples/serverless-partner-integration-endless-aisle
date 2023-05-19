import { FaShoppingCart } from "react-icons/fa";
import { AiFillDelete } from "react-icons/ai";
import {
  Badge,
  Button,
  Container,
  Dropdown,
  FormControl,
  Nav,
  Navbar,
} from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { CartState } from "../context/Context";
import "./styles.css";

const Header = ({ signOut }) => {
  const {
    state: { cart },
    dispatch,
    productDispatch,
  } = CartState();

  return (
    <Navbar bg="dark" variant="dark" style={{ height: 100 }}>
      <Container>
        <Navbar.Brand>
          <Link to="/">AnyCompany</Link>
        </Navbar.Brand>
        <Navbar.Text>
          <Link to="/search">Lookup Products</Link>
        </Navbar.Text>
        <Navbar.Text>
          <Link to="/">Lookup Partner</Link>
        </Navbar.Text>
        {useLocation().pathname.split("/")[1] === "products" && (
          <Navbar.Text className="search">
            <FormControl
              style={{ width: 500 }}
              type="search"
              placeholder="Search a product..."
              className="m-auto"
              aria-label="Search"
              onChange={(e) => {
                productDispatch({
                  type: "FILTER_BY_SEARCH",
                  payload: e.target.value,
                });
              }}
            />
          </Navbar.Text>
        )}
        {useLocation().pathname.split("/")[1] !== "" && (
          <Nav>
            <Dropdown align="end">
              <Dropdown.Toggle variant="success">
                <FaShoppingCart color="white" fontSize="25px" />
                <Badge>{cart.length}</Badge>
              </Dropdown.Toggle>

              <Dropdown.Menu style={{ minWidth: 370 }}>
                {cart.length > 0 ? (
                  <>
                    {cart.map((prod) => (
                      <span className="cartitem" key={prod.itemId}>
                        <img
                          src={`${require(`../../images/products/${prod.itemId}.jpg`)}`}
                          className="cartItemImg"
                          alt={prod.name}
                        />
                        <div className="cartItemDetail">
                          <span>{prod.name}</span>
                          <span> ${prod.price}</span>
                        </div>
                        <AiFillDelete
                          fontSize="20px"
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            dispatch({
                              type: "REMOVE_FROM_CART",
                              payload: prod,
                            })
                          }
                        />
                      </span>
                    ))}
                    <Link to="/cart">
                      <Button style={{ width: "95%", margin: "0 10px" }}>
                        Go To Cart
                      </Button>
                    </Link>
                  </>
                ) : (
                  <span style={{ padding: 10 }}>Cart is Empty!</span>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </Nav>)}
        <Button color="inherit" onClick={signOut}>
          Sign out
        </Button>
      </Container>
    </Navbar>
  );
};

export default Header;
