import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';

function SubHeader({ text }) {
    return (

        <Navbar expand="lg" variant="light" bg="light">
            <Container>
                <Navbar.Brand>{text}</Navbar.Brand>
            </Container>
        </Navbar>

    );
}

export default SubHeader;