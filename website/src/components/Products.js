import React from 'react'
import Filters from "./Filters";
import { CartState } from "../context/Context";
import SingleProduct from "./SingleProduct";
const Products = () => {
    const {
        state: { products },
        productState: { sort, byStock, byFastDelivery, byRating, searchQuery, byPartner, searchSkuQuery },
    } = CartState();
    const transformProducts = () => {
        let sortedProducts = products;

        if (sort) {
            sortedProducts = sortedProducts.sort((a, b) =>
                sort === "lowToHigh" ? a.price - b.price : b.price - a.price
            );
        }

        if (byPartner) {
            sortedProducts = sortedProducts.filter((prod) => prod.partner.toLowerCase().includes(byPartner.toLowerCase()));
        }

        if (!byStock) {
            sortedProducts = sortedProducts.filter((prod) => prod.inStock);
        }
        if (byFastDelivery) {
            sortedProducts = sortedProducts.filter((prod) => prod.fastDelivery);
        }

        if (byRating) {
            sortedProducts = sortedProducts.filter(
                (prod) => prod.ratings >= byRating
            );
        }

        if (searchQuery) {
            sortedProducts = sortedProducts.filter((prod) =>
                prod.name.toLowerCase().includes(searchQuery)
            );
        }
        if (searchSkuQuery) {
            sortedProducts = sortedProducts.filter((prod) =>
                prod.sku.toLowerCase().includes(searchSkuQuery) || prod.itemId.toLowerCase().includes(searchSkuQuery)
            );
        }

        return sortedProducts;
    };
    return (

        <div className="home">
            <Filters />
            <div className="productContainer">
                {transformProducts().map((prod) => (
                    <SingleProduct prod={prod} key={prod.itemId} />
                ))}
            </div>
        </div>
    )
}

export default Products