import { Card, Button } from "react-bootstrap";
import { CartState } from "../context/Context";
import { Link } from "react-router-dom";

const Partners = ({ partner }) => {
    const {
        productDispatch,
    } = CartState();
    function validate(partnerId) {
        if (partnerId > 0 && partnerId < 4) {
            return true;
        }
        return false;
    }
    return (
        <div className="partners">
            <Card>
                <Card.Img variant="top" src={`${require(`../../images/partners/${partner.partnerId}.jpg`)}`} alt={partner.name} />
                <Card.Body>
                    <Card.Title>{partner.name}</Card.Title>
                    <Card.Subtitle style={{ paddingBottom: 10 }}>
                    </Card.Subtitle>
                    {(validate(partner.partnerId) ?
                        <Link to={{
                            pathname: "/products"
                        }}>
                            <Button
                                id={partner.partner + "-btn"}
                                onClick={() =>
                                    productDispatch({
                                        type: "FILTER_BY_PARTNER",
                                        payload: partner.partner,
                                    })
                                }
                            > Select {partner.name}
                            </Button>
                        </Link> :
                        <Button
                            id={partner.partner + "-btn"}
                            disabled={true}
                        > Select {partner.name}
                        </Button>)}
                </Card.Body>
            </Card>
        </div>
    );
};

export default Partners;
