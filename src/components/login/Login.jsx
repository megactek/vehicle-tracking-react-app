import { Cancel, Room } from "@material-ui/icons";
import { useState, useRef } from "react";
import "./login.css";
import axios from "axios";

const Login = ({ setShowLogin, myStorage, setCurrentUser }) => {
  const [failure, setFailure] = useState(false);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef();
  const passwordRef = useRef();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const newUser = {
      email: nameRef.current.value,
      password: passwordRef.current.value,
    };
    try {
      const res = await axios.post("/users/login", newUser);
      if (res.status === 200) {
        setFailure(false);
        myStorage.setItem("user", JSON.stringify(res.data));
        setCurrentUser(res.data);
        setShowLogin(false);
        return;
      } else {
        setFailure(true);
      }
    } catch (err) {
      console.log(err);
      setFailure(true);
    }
    setLoading(false);
  };
  return (
    <div className="loginContainer">
      <div className="logo">
        <Room /> Vehicle Tracking
      </div>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="email" ref={nameRef} />
        <input type="password" placeholder="password" ref={passwordRef} />
        <button className="loginButton" disabled={loading} type="button">
          {loading ? "loading..." : "Login"}
        </button>
        {failure && <span className="failure">Something went wrong!</span>}
      </form>
      <Cancel className="loginCancel" onClick={() => setShowLogin(false)} />
    </div>
  );
};

export default Login;
