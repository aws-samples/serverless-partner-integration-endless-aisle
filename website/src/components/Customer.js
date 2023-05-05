import React, { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { MDBInput, MDBCard, MDBCardBody, MDBCardHeader, MDBCol, MDBRow, MDBTypography } from 'mdb-react-ui-kit';
import { CartState } from "../context/Context";
import SubHeader from "./SubHeader";
import { Link } from "react-router-dom";


function Customer() {
  const {
    state: { cart, customerDetails },
    dispatch,
    productDispatch,
  } = CartState();
  const [orderStatus, setOrderStatus] = useState("");
  useEffect(() => {
    if (!cart.length < 1) {
      setValidated(
        false
      );
    }
  }, [cart]);

  const [validated, setValidated] = useState(true);

  const [errors, setErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!customerDetails.email) {
      errors.email = "Please provide your Email";
    }
    if (!customerDetails.address) {
      errors.address = "Please provide Street Address";
    }
    if (!customerDetails.city) {
      errors.city = "Please provide your City";
    }
    if (!customerDetails.state) {
      errors.state = "Please provide your State";
    }
    if (!customerDetails.postalCode) {
      errors.postalCode = "Please provide your postalCode";
    } else if (!/^\d{5}$/.test(customerDetails.postalCode)) {
      errors.postalCode = "Zip code must be 5 digits";
    }
    if (!customerDetails.country) {
      errors.country = "Please provide your Country";
    }
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (validate()) {
      // Submit the form
      submitOrder(cart, customerDetails);
      setOrderStatus("Your Order has been submitted Successfully!!!")
      dispatch({
        type: "CLEAR_CART"
      });
      productDispatch({
        type: "CLEAR_FILTERS",
      });
      console.log("Submitting form...");
    }
  };

  const submitOrder = (cart, customerDetails) => {
    cart.forEach(item => {

      const body = {
        requestedItem: {
          itemId: item.itemId,
          quantity: item.qty,
          size: item.size,
          partner: item.partner,
          price: Number(item.price),
          partnerId: item.partnerId,
          sku: item.sku,
          category: item.category
        },
        customer: {
          address: JSON.stringify({ address: customerDetails.address, city: customerDetails.city, state: customerDetails.state, country: customerDetails.country, postalCode: customerDetails.postalCode }),
          contact: "test",
          email: customerDetails.email
        }
      }

      console.log(`body ${JSON.stringify(body)}`);
      //"/orders/order"
      fetch(process.env.REACT_APP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          body
        ),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
        });
    });

  }

  return (
    <div className="mx-auto gradient-custom mt-5" style={{ maxWidth: '900px' }}>
      {orderStatus ? (
        <>
          <SubHeader text={orderStatus}></SubHeader>
          <Link to="/">
            <Button style={{ width: "95%", margin: "0 10px" }}>
              Go To Home
            </Button>
          </Link>
        </>
      ) : (

        <MDBCard className="mb-4">
          <MDBCardHeader className="py-3">
            <MDBTypography tag="h5" className="mb-0">Shipping details</MDBTypography>
            {errors.email && <div><md-subheader class="md-no-sticky" style={{ color: 'red' }}>! {errors.email}</md-subheader></div>}
            {errors.address && <div><md-subheader class="md-no-sticky" style={{ color: 'red' }}> ! {errors.address}</md-subheader></div>}
            {errors.city && <div><md-subheader class="md-no-sticky" style={{ color: 'red' }}>! {errors.city}</md-subheader></div>}
            {errors.state && <div><md-subheader class="md-no-sticky" style={{ color: 'red' }}>! {errors.state}</md-subheader></div>}
            {errors.postalCode && <div><md-subheader class="md-no-sticky" style={{ color: 'red' }}>! {errors.postalCode}</md-subheader></div>}
            {errors.country && <div><md-subheader class="md-no-sticky" style={{ color: 'red' }}>! {errors.country}</md-subheader></div>}
          </MDBCardHeader>
          <MDBCardBody>
            <form className="mb-0" noValidate onSubmit={handleSubmit} >
              <MDBRow className="mb-4">
                <MDBCol>
                  <MDBInput label='Email' type='email' className="mb-4" name="email"
                    onChange={(e) => {
                      dispatch({
                        type: "ADD_CUSTOMER_DETAILS_EMAIL",
                        payload: e.target.value,
                      });
                    }}
                    value={customerDetails.email}
                    required
                    invalid={MDBInput.invalid}
                    validation="Please provide your Email" />
                </MDBCol>
              </MDBRow>
              <MDBRow className="mb-4">
                <MDBCol>
                  <MDBInput label='Street Address' type='text' className="mb-4" name="address"
                    onChange={(e) => {
                      dispatch({
                        type: "ADD_CUSTOMER_DETAILS_ADDRESS",
                        payload: e.target.value,
                      });
                    }}
                    value={customerDetails.address}
                    required
                    invalid={MDBInput.invalid}
                    validation="Please provide your Street Address" />
                </MDBCol>
              </MDBRow>
              <MDBRow className="mb-4">
                <MDBCol>
                  <MDBInput label='City' type='text' name="city"
                    onChange={(e) => {
                      dispatch({
                        type: "ADD_CUSTOMER_DETAILS_CITY",
                        payload: e.target.value,
                      });
                    }}
                    value={customerDetails.city}
                    required
                    invalid={MDBInput.invalid}
                    validation="Please provide your City" />
                </MDBCol>
                <MDBCol>
                  <MDBInput label='State' type='text' name="state"
                    onChange={(e) => {
                      dispatch({
                        type: "ADD_CUSTOMER_DETAILS_STATE",
                        payload: e.target.value,
                      });
                    }}
                    value={customerDetails.state}
                    required
                    invalid={MDBInput.invalid}
                    validation="Please provide your State" />
                </MDBCol>
              </MDBRow>
              <MDBRow>
                <MDBCol>
                  <MDBInput label='Postal Code' type='text' name="postalCode"
                    onChange={(e) => {
                      dispatch({
                        type: "ADD_CUSTOMER_DETAILS_POSTALCODE",
                        payload: e.target.value,
                      });
                    }}
                    value={customerDetails.postalCode}
                    required
                    invalid={MDBInput.invalid}
                    validation="Please provide valid Zipcode" />
                </MDBCol>
                <MDBCol>
                  <MDBInput label='Country' type='text' name="country"
                    onChange={(e) => {
                      dispatch({
                        type: "ADD_CUSTOMER_DETAILS_COUNTRY",
                        payload: e.target.value,
                      });
                    }}
                    value={customerDetails.country}
                    formNoValidate
                    required
                    invalid={MDBInput.invalid}
                    validation="Please provide valid Country" />
                </MDBCol>
              </MDBRow>
              <Button variant="primary" disabled={validated} type="submit" onClick={handleSubmit} size="lg">
                Send Order to Partner
              </Button>
            </form>
          </MDBCardBody>
        </MDBCard>
      )}
    </div>
  );
}

export default Customer;