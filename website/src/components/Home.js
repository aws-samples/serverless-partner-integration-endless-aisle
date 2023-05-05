import Partners from "./Partners";
import SubHeader from "./SubHeader";
import { partnerList } from "../context/productList";
const Home = () => {
  return (
    <>
      <SubHeader text={"Select a Partner"} />
      <div className="home">
        <div className="productContainer">
          {partnerList.map((partner) => (
            <Partners partner={partner} key={partner.partnerId} />
          ))}
        </div>
      </div>
    </>
  );
};

export default Home;
