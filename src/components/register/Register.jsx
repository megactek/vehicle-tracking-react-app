import { Cancel, Room } from "@material-ui/icons";
import { useState, useRef } from "react";
import "./register.css";
import axios from "axios";

const Register = ({ setShowRegister }) => {
  const [success, setSuccess] = useState(false);
  const [failure, setFailure] = useState(false);
  const nameRef = useRef();
  const emailRef = useRef();
  const actTypeRef = useRef();
  const passwordRef = useRef();
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (actTypeRef.current.value === "") {
      alert("select account type");
      return;
    }
    const newUser = {
      username: nameRef.current.value,
      password: passwordRef.current.value,
      email: emailRef.current.value,
      accountType: actTypeRef.current.value,
    };

    try {
      const res = await axios.post(process.env.REACT_APP_PROXY + "/users/register", newUser);
      setFailure(false);
      setSuccess(true);
      setTimeout(() => {
        setShowRegister(false);
      }, 2000);
    } catch (err) {
      console.log(err);
      setFailure(true);
    }
  };
  return (
    <div className="registerContainer">
      <div className="logo">
        <Room /> MegacPin
      </div>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="username" ref={nameRef} />
        <input type="email" placeholder="email" ref={emailRef} />
        <select placeholder="account type" ref={actTypeRef}>
          <option value="" default>
            account type
          </option>
          <option value="driver">Driver</option>
          <option value="manager">Manager</option>
        </select>
        <input type="password" placeholder="password" ref={passwordRef} />
        <button className="registerButton" type="button" disabled={loading}>
          {loading ? "loading..." : "Register"}
        </button>
        {success && <span className="success">Successful, You can login now!</span>}
        {failure && <span className="failure">Something went wrong!</span>}
      </form>
      <Cancel className="registerCancel" onClick={() => setShowRegister(false)} />
    </div>
  );
};

export default Register;
