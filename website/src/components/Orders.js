import { Col, Image, ListGroup, Row } from "react-bootstrap";
const Orders = ({ orders }) => {
    return (
        <div className="productContainer">
            <ListGroup>
                <ListGroup.Item key={orders.product.itemId}>
                    <Row>
                        <Col md={2}>
                            <Image src={`${require(`../../images/products/${orders.product.itemId}.jpg`)}`} alt={orders.product.itemId} fluid rounded />
                        </Col>
                        <Col md={2}>
                            <span>Order Date: {
                                new Intl.DateTimeFormat('en-US', {
                                    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                }).format(orders.orderDate)}</span>
                        </Col>
                        <Col md={2}>
                            <span>From: {orders.partner}</span>
                        </Col>
                        <Col md={2}> Price: ${orders.price}</Col>
                        <Col md={2}>
                            Status: {orders.orderStatus}
                        </Col>
                        <Col md={2}>
                            Discription: {orders.statusDescription}
                        </Col>
                        <Col md={2}>
                            Size: {orders.product.size}
                        </Col>
                        <Col md={2}>
                            Quantity: {orders.product.quantity}
                        </Col>
                        <Col md={2}>
                            Contact: {orders.subscribers[0].email}
                        </Col>
                    </Row>
                </ListGroup.Item>
            </ListGroup>
        </div>
    );
};

export default Orders;
