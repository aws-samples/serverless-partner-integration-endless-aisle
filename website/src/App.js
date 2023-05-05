import "./App.css";
import Header from "./components/Header";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Cart from "./components/Cart";
import Customer from "./components/Customer";
import Products from "./components/Products";
import Search from "./components/Search";
console.log(process.env)

function App() {
  return (
    <BrowserRouter>
      <Header />
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customer" element={<Customer />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
